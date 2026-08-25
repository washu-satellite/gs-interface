import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

const UA = "gs-interface/1.0 (WashU Satellite ground station; contact: ops@washusatellite.com)";

async function fetchTle(id: string): Promise<{ ok: true; text: string } | { ok: false; status: number }> {
    const url = `https://celestrak.org/NORAD/elements/gp.php?CATNR=${id}&FORMAT=TLE`;
    let lastStatus = 0;
    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            const res = await fetch(url, {
                headers: { "User-Agent": UA, Accept: "text/plain" },
                next: { revalidate: 3600 },
            });
            if (res.ok) return { ok: true, text: (await res.text()).trim() };
            lastStatus = res.status;
            if (res.status !== 503 && res.status !== 429 && res.status !== 500) break;
        } catch {
            lastStatus = 0;
        }
        await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
    }
    return { ok: false, status: lastStatus };
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ noradId: string }> }) {
    const { response: unauth } = await requireSession();
    if (unauth) return unauth;

    const { noradId } = await params;
    const id = (noradId ?? "").replace(/\D/g, "");
    if (!id) return NextResponse.json({ error: "Invalid NORAD ID" }, { status: 400 });

    const result = await fetchTle(id);
    if (!result.ok) {
        const msg =
            result.status === 503 || result.status === 429
                ? "Celestrak is temporarily rate-limiting — try again shortly, or paste a TLE manually."
                : result.status === 0
                  ? "Could not reach Celestrak."
                  : `Celestrak responded ${result.status}`;
        return NextResponse.json({ error: msg }, { status: 503 });
    }

    const text = result.text;
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
