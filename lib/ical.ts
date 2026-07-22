export type IcalEvent = {
    id: number | string;
    kind: string;
    title: string;
    startsAt: string | Date;
    durationMin: number;
    station?: string | null;
    detail?: string | null;
};

const KIND_LABELS: Record<string, string> = {
    pass: "Pass",
    downlink: "Downlink",
    maneuver: "Maneuver",
    maintenance: "Maintenance",
    anomaly: "Anomaly",
    planning: "Planning",
    misc: "Misc",
};

function pad(n: number, len = 2) {
    return String(n).padStart(len, "0");
}

function toUtcStamp(d: Date) {
    return (
        `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
        `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
    );
}

function escapeText(v: string) {
    return v
        .replace(/\\/g, "\\\\")
        .replace(/;/g, "\\;")
        .replace(/,/g, "\\,")
        .replace(/\r?\n/g, "\\n");
}

function fold(line: string) {
    const bytes = Buffer.from(line, "utf8");
    if (bytes.length <= 75) return line;
    const out: Buffer[] = [];
    let start = 0;
    let limit = 75;
    while (start < bytes.length) {
        let end = Math.min(start + limit, bytes.length);
        while (end > start && (bytes[end] & 0xc0) === 0x80) end--;
        out.push(bytes.subarray(start, end));
        start = end;
        limit = 74;
    }
    return out.map((b, i) => (i === 0 ? b.toString("utf8") : " " + b.toString("utf8"))).join("\r\n");
}

export function buildIcs(calendarName: string, events: IcalEvent[], now = new Date()): string {
    const lines: string[] = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//WashU Satellite//GS 2.1.0//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        `X-WR-CALNAME:${escapeText(calendarName)}`,
        "X-WR-TIMEZONE:UTC",
    ];

    const stamp = toUtcStamp(now);

    for (const ev of events) {
        const start = ev.startsAt instanceof Date ? ev.startsAt : new Date(ev.startsAt);
        if (Number.isNaN(start.getTime())) continue;
        const end = new Date(start.getTime() + Math.max(1, ev.durationMin) * 60000);
        const label = KIND_LABELS[ev.kind] ?? ev.kind;

        lines.push("BEGIN:VEVENT");
        lines.push(`UID:gs-event-${ev.id}@washusatellite`);
        lines.push(`DTSTAMP:${stamp}`);
        lines.push(`DTSTART:${toUtcStamp(start)}`);
        lines.push(`DTEND:${toUtcStamp(end)}`);
        lines.push(`SUMMARY:${escapeText(ev.title)}`);
        lines.push(`CATEGORIES:${escapeText(label)}`);
        if (ev.station) lines.push(`LOCATION:${escapeText(ev.station)}`);
        if (ev.detail) lines.push(`DESCRIPTION:${escapeText(ev.detail)}`);
        lines.push("END:VEVENT");
    }

    lines.push("END:VCALENDAR");
    return lines.map(fold).join("\r\n") + "\r\n";
}
