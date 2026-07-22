import { db, ensureViewSchema } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    await ensureViewSchema();
    const body = await req.json();
    const hasName = typeof body.name === "string";
    const hasIcon = typeof body.icon === "string" && body.icon;
    const { rows } = await db.query(
        `UPDATE dashboard_view SET
            name = COALESCE($1, name),
            icon = COALESCE($2, icon)
         WHERE id = $3
         RETURNING id, "projectId", name, blocks, ord, icon`,
        [hasName ? body.name.toString().slice(0, 60) : null, hasIcon ? body.icon.slice(0, 32) : null, id]
    );
    return NextResponse.json(rows[0] ?? null);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    await db.query("DELETE FROM dashboard_view WHERE id = $1", [id]);
    return NextResponse.json({ ok: true });
}
