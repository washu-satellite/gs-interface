import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { bridgeBase, bridgeHeaders } from "@/lib/gds-bridge";

export const dynamic = "force-dynamic";

export async function GET() {
    const { response: unauth } = await requireSession();
    if (unauth) return unauth;

    const base = bridgeBase();
    if (!base) {
        return NextResponse.json(
            { error: "GDS bridge not configured", configured: false },
            { status: 503 }
        );
    }

    try {
        const res = await fetch(`${base}/dictionary`, { cache: "no-store", headers: bridgeHeaders() });
        const data = await res.json().catch(() => ({}));
        return NextResponse.json(data, { status: res.status });
    } catch {
        return NextResponse.json(
            { error: "GDS bridge unreachable", configured: true, reachable: false },
            { status: 502 }
        );
    }
}
