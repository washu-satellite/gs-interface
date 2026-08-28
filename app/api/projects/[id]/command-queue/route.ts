import { db, ensureCommandQueueSchema } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

const COLUMNS = `id, "projectId", ord, kind, mnemonic, args, "blockType", "blockConfig", status, error, "queuedBy", "queuedByName", "createdAt"`;
const BLOCK_TYPES = ["delay", "wait_event"];

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { response: unauth } = await requireSession();
    if (unauth) return unauth;

    const { id } = await params;
    await ensureCommandQueueSchema();
    const { rows } = await db.query(
        `SELECT ${COLUMNS} FROM command_queue WHERE "projectId" = $1 ORDER BY ord ASC, "createdAt" ASC, id ASC`,
        [id]
    );
    return NextResponse.json(rows);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { session, response: unauth } = await requireSession();
    if (unauth) return unauth;

    const { id } = await params;
    await ensureCommandQueueSchema();
    const body = await req.json().catch(() => ({}));

    const kind = body?.kind === "block" ? "block" : "command";

    if (kind === "command") {
        const mnemonic: string = typeof body?.mnemonic === "string" ? body.mnemonic.trim() : "";
        const args: string[] = Array.isArray(body?.args) ? body.args.map(String) : [];
        if (!mnemonic) return NextResponse.json({ error: "mnemonic is required" }, { status: 400 });

        const { rows } = await db.query(
            `INSERT INTO command_queue ("projectId", ord, kind, mnemonic, args, "queuedBy", "queuedByName")
             VALUES ($1, (SELECT COALESCE(MAX(ord), 0) + 1 FROM command_queue WHERE "projectId" = $1), 'command', $2, $3, $4, $5)
             RETURNING ${COLUMNS}`,
            [id, mnemonic, JSON.stringify(args), session.userId, session.name]
        );
        return NextResponse.json(rows[0], { status: 201 });
    }

    const blockType: string = BLOCK_TYPES.includes(body?.blockType) ? body.blockType : "";
    if (!blockType) return NextResponse.json({ error: "blockType must be one of: " + BLOCK_TYPES.join(", ") }, { status: 400 });

    let blockConfig: Record<string, unknown>;
    if (blockType === "delay") {
        const seconds = Number(body?.blockConfig?.seconds);
        if (!Number.isFinite(seconds) || seconds <= 0) return NextResponse.json({ error: "delay seconds must be a positive number" }, { status: 400 });
        blockConfig = { seconds: Math.min(seconds, 24 * 60 * 60) };
    } else {
        const eventName: string = typeof body?.blockConfig?.eventName === "string" ? body.blockConfig.eventName.trim() : "";
        const timeoutSec = Number(body?.blockConfig?.timeoutSec);
        if (!eventName) return NextResponse.json({ error: "eventName is required" }, { status: 400 });
        blockConfig = { eventName, timeoutSec: Number.isFinite(timeoutSec) && timeoutSec > 0 ? Math.min(timeoutSec, 3600) : 120 };
    }

    const { rows } = await db.query(
        `INSERT INTO command_queue ("projectId", ord, kind, "blockType", "blockConfig", "queuedBy", "queuedByName")
         VALUES ($1, (SELECT COALESCE(MAX(ord), 0) + 1 FROM command_queue WHERE "projectId" = $1), 'block', $2, $3, $4, $5)
         RETURNING ${COLUMNS}`,
        [id, blockType, JSON.stringify(blockConfig), session.userId, session.name]
    );
    return NextResponse.json(rows[0], { status: 201 });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { response: unauth } = await requireSession();
    if (unauth) return unauth;

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const order: number[] = Array.isArray(body?.order) ? body.order : [];
    await Promise.all(
        order.map((itemId, i) =>
            db.query('UPDATE command_queue SET ord = $1 WHERE id = $2 AND "projectId" = $3', [i, itemId, id])
        )
    );
    return NextResponse.json({ ok: true });
}
