import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { response: unauth } = await requireSession();
    if (unauth) return unauth;

    const { id } = await params;
    await db.query("DELETE FROM command_queue WHERE id = $1", [id]);
    return NextResponse.json({ ok: true });
}

export async function PATCH(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { response: unauth } = await requireSession();
    if (unauth) return unauth;

    const { id } = await params;
    const { rows } = await db.query(
        `UPDATE command_queue SET status = 'queued', error = NULL
         WHERE id = $1 AND status = 'error'
         RETURNING id`,
        [id]
    );
    if (!rows[0]) return NextResponse.json({ error: "Item is not in an error state" }, { status: 409 });
    return NextResponse.json({ ok: true });
}
