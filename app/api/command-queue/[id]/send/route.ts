import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { bridgeBase, bridgeHeaders } from "@/lib/gds-bridge";

export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { session, response: unauth } = await requireSession();
    if (unauth) return unauth;

    const { id } = await params;

    const base = bridgeBase();
    if (!base) {
        return NextResponse.json(
            { error: "GDS bridge not configured", configured: false },
            { status: 503 }
        );
    }

    const { rows: claimed } = await db.query(
        `UPDATE command_queue SET status = 'sending'
         WHERE id = $1 AND status = 'queued'
         RETURNING id, kind, mnemonic, args`,
        [id]
    );
    const queued = claimed[0];
    if (!queued) {
        const { rows: existing } = await db.query("SELECT status FROM command_queue WHERE id = $1", [id]);
        if (!existing[0]) return NextResponse.json({ error: "Queued command not found" }, { status: 404 });
        return NextResponse.json({ error: `Already claimed (status: ${existing[0].status})` }, { status: 409 });
    }
    if (queued.kind === "block") {
        await db.query("UPDATE command_queue SET status = 'queued' WHERE id = $1", [id]);
        return NextResponse.json({ error: "This is a control block, not a command - it can't be sent to gds-bridge" }, { status: 400 });
    }

    console.log(`[uplink] ${session.userId} -> ${queued.mnemonic} [${(queued.args ?? []).join(", ")}] (from queue #${id})`);

    let res: Response;
    try {
        res = await fetch(`${base}/commands`, {
            method: "POST",
            cache: "no-store",
            headers: bridgeHeaders(true),
            body: JSON.stringify({ mnemonic: queued.mnemonic, args: queued.args ?? [] }),
        });
    } catch {
        await db.query(
            `UPDATE command_queue SET status = 'error', error = 'GDS bridge unreachable' WHERE id = $1`,
            [id]
        );
        return NextResponse.json(
            { error: "GDS bridge unreachable", configured: true, reachable: false },
            { status: 502 }
        );
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        const message = typeof data?.error === "string" ? data.error : `gds-bridge returned ${res.status}`;
        await db.query(`UPDATE command_queue SET status = 'error', error = $1 WHERE id = $2`, [message, id]);
        return NextResponse.json(data, { status: res.status });
    }

    await db.query("DELETE FROM command_queue WHERE id = $1", [id]);
    return NextResponse.json(data, { status: res.status });
}
