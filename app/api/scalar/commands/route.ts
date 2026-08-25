import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { bridgeBase, bridgeHeaders } from "@/lib/gds-bridge";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
    const { session, response: unauth } = await requireSession();
    if (unauth) return unauth;

    const base = bridgeBase();
    if (!base) {
        return NextResponse.json(
            { error: "GDS bridge not configured", configured: false },
            { status: 503 }
        );
    }

    const body = await req.json().catch(() => null);
    const mnemonic = typeof body?.mnemonic === "string" ? body.mnemonic.trim() : "";
    if (!mnemonic) {
        return NextResponse.json({ error: "missing 'mnemonic'" }, { status: 400 });
    }

    const args = Array.isArray(body?.args) ? body.args.map(String) : [];

    // Uplink is the one path that changes spacecraft state, so record who sent
    // what before it leaves the ground segment.
    console.log(`[uplink] ${session.userId} -> ${mnemonic} [${args.join(", ")}]`);

    try {
        const res = await fetch(`${base}/commands`, {
            method: "POST",
            cache: "no-store",
            headers: bridgeHeaders(true),
            body: JSON.stringify({ mnemonic, args }),
        });
        const data = await res.json().catch(() => ({}));
        return NextResponse.json(data, { status: res.status });
    } catch {
        return NextResponse.json(
            { error: "GDS bridge unreachable", configured: true, reachable: false },
            { status: 502 }
        );
    }
}
