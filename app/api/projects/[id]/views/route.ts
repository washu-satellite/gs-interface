import { db, ensureViewSchema } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { response: unauth } = await requireSession();
    if (unauth) return unauth;

    const { id } = await params;
    await ensureViewSchema();
    const { rows } = await db.query(
        'SELECT id, "projectId", name, blocks, ord, icon FROM dashboard_view WHERE "projectId" = $1 ORDER BY ord, id',
        [id]
    );
    return NextResponse.json(rows);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { response: unauth } = await requireSession();
    if (unauth) return unauth;

    const { id } = await params;
    const body = await req.json();
    const order: number[] = Array.isArray(body.order) ? body.order : [];
    await Promise.all(
        order.map((viewId, i) =>
            db.query('UPDATE dashboard_view SET ord = $1 WHERE id = $2 AND "projectId" = $3', [i, viewId, id])
        )
    );
    return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { response: unauth } = await requireSession();
    if (unauth) return unauth;

    const { id } = await params;
    await ensureViewSchema();
    const body = await req.json();
    const name: string = (body.name ?? "Untitled View").toString().slice(0, 60);
    const blocks: string[] = Array.isArray(body.blocks) ? body.blocks : [];
    const icon: string = typeof body.icon === "string" && body.icon ? body.icon.slice(0, 32) : "grid";
    const { rows } = await db.query(
        `INSERT INTO dashboard_view ("projectId", name, blocks, ord, icon)
         VALUES ($1, $2, $3, (SELECT COALESCE(MAX(ord), 0) + 1 FROM dashboard_view WHERE "projectId" = $1), $4)
         RETURNING id, "projectId", name, blocks, ord, icon`,
        [id, name, JSON.stringify(blocks), icon]
    );
    return NextResponse.json(rows[0]);
}
