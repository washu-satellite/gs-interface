const UA = "gs-interface/1.0 (WashU Satellite ground station; contact: ops@washusatellite.com)";

export type TleFetchResult =
    | { ok: true; name: string; line1: string; line2: string }
    | { ok: false; error: string };

export async function fetchTleFromCelestrak(noradId: string): Promise<TleFetchResult> {
    const id = (noradId ?? "").replace(/\D/g, "");
    if (!id) return { ok: false, error: "Invalid NORAD ID" };

    const url = `https://celestrak.org/NORAD/elements/gp.php?CATNR=${id}&FORMAT=TLE`;
    let lastStatus = 0;
    let text = "";
    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            const res = await fetch(url, {
                headers: { "User-Agent": UA, Accept: "text/plain" },
                next: { revalidate: 3600 },
            });
            if (res.ok) {
                text = (await res.text()).trim();
                lastStatus = 200;
                break;
            }
            lastStatus = res.status;
            if (res.status !== 503 && res.status !== 429 && res.status !== 500) break;
        } catch {
            lastStatus = 0;
        }
        await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
    }

    if (lastStatus !== 200) {
        const error =
            lastStatus === 503 || lastStatus === 429
                ? "Celestrak is temporarily rate-limiting — try again shortly, or paste a TLE manually."
                : lastStatus === 0
                  ? "Could not reach Celestrak."
                  : `Celestrak responded ${lastStatus}`;
        return { ok: false, error };
    }

    if (!text || text.toLowerCase().includes("no gp data")) {
        return { ok: false, error: "No TLE found for that NORAD ID" };
    }

    const lines = text.split(/\r?\n/).map((l) => l.trimEnd()).filter(Boolean);
    const line1 = lines.find((l) => l.startsWith("1 "));
    const line2 = lines.find((l) => l.startsWith("2 "));
    if (!line1 || !line2) return { ok: false, error: "Malformed TLE" };

    const name = lines[0] && !lines[0].startsWith("1 ") ? lines[0].trim() : `NORAD ${id}`;
    return { ok: true, name, line1, line2 };
}
