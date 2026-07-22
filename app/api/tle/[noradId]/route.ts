import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ noradId: string }> }) {
    const { noradId } = await params;
    const id = (noradId ?? "").replace(/\D/g, "");
    if (!id) return NextResponse.json({ error: "Invalid NORAD ID" }, { status: 400 });

    let text: string;
    try {
        const res = await fetch(`https://celestrak.org/NORAD/elements/gp.php?CATNR=${id}&FORMAT=TLE`, {
            headers: { "User-Agent": "gs-interface" },
            cache: "no-store",
        });
        if (!res.ok) return NextResponse.json({ error: `Celestrak responded ${res.status}` }, { status: 502 });
        text = (await res.text()).trim();
    } catch {
        return NextResponse.json({ error: "Could not reach Celestrak" }, { status: 502 });
    }

    if (!text || text.toLowerCase().includes("no gp data")) {
        return NextResponse.json({ error: "No TLE found for that NORAD ID" }, { status: 404 });
    }

    const lines = text.split(/\r?\n/).map((l) => l.trimEnd()).filter(Boolean);
    const line1 = lines.find((l) => l.startsWith("1 "));
    const line2 = lines.find((l) => l.startsWith("2 "));
    if (!line1 || !line2) return NextResponse.json({ error: "Malformed TLE" }, { status: 502 });

    const name = lines[0] && !lines[0].startsWith("1 ") ? lines[0].trim() : `NORAD ${id}`;
    return NextResponse.json({ name, line1, line2 });
}
