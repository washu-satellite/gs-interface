import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { fetchTleFromCelestrak } from "@/lib/tle";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ noradId: string }> }) {
    const { response: unauth } = await requireSession();
    if (unauth) return unauth;

    const { noradId } = await params;
    const result = await fetchTleFromCelestrak(noradId);
    if (!result.ok) {
        const status = result.error === "Invalid NORAD ID" ? 400 : result.error === "No TLE found for that NORAD ID" ? 404 : 503;
        return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json({ name: result.name, line1: result.line1, line2: result.line2 });
}
