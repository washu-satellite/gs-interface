import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { bridgeBase, bridgeHeaders } from "@/lib/gds-bridge";

export const dynamic = "force-dynamic";

export async function GET() {
    const { response: unauth } = await requireSession();
    if (unauth) return unauth;

    const base = bridgeBase();
    if (!base) {
        return NextResponse.json({ status: "unconfigured", secondsSinceLastData: null });
    }

    try {
        const res = await fetch(`${base}/health`, { cache: "no-store", headers: bridgeHeaders() });
        if (!res.ok) return NextResponse.json({ status: "unreachable", secondsSinceLastData: null });
        const data = await res.json().catch(() => ({}));
        return NextResponse.json({
            status: data?.status ?? "unreachable",
            secondsSinceLastData: typeof data?.secondsSinceLastData === "number" ? data.secondsSinceLastData : null,
        });
    } catch {
        return NextResponse.json({ status: "unreachable", secondsSinceLastData: null });
    }
}
