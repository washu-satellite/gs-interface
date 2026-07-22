import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const body = await req.json();
    const name: string = (body.name ?? "").toString().slice(0, 60);
    const { rows } = await db.query(
        'UPDATE dashboard_view SET name = $1 WHERE id = $2 RETURNING id, "projectId", name, blocks, ord',
        [name, id]
    );
    return NextResponse.json(rows[0] ?? null);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    await db.query("DELETE FROM dashboard_view WHERE id = $1", [id]);
    return NextResponse.json({ ok: true });
}
