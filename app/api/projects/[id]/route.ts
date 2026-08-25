import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { response: unauth } = await requireSession();
    if (unauth) return unauth;

    const { id } = await params;
    const { rows } = await db.query(
        'SELECT id, name, ord, config, configured FROM project WHERE id = $1',
        [id]
    );
    if (!rows[0]) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json(rows[0]);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { response: unauth } = await requireSession();
    if (unauth) return unauth;

    const { id } = await params;
    const body = await req.json();
    const { rows } = await db.query(
        'UPDATE project SET config = $1, configured = true, "updatedAt" = now() WHERE id = $2 RETURNING id, name, ord, config, configured',
        [JSON.stringify(body.config ?? {}), id]
    );
    if (!rows[0]) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json(rows[0]);
}
