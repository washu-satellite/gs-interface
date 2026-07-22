import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const { rows } = await db.query(
        'SELECT id, "projectId", level, title, message, "createdAt" FROM notification WHERE "projectId" = $1 AND read = false ORDER BY "createdAt" DESC',
        [id]
    );
    return NextResponse.json(rows);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const level: string = ["info", "warning", "critical"].includes(body?.level) ? body.level : "info";
    const title: string = typeof body?.title === "string" ? body.title.trim() : "";
    const message: string | null = typeof body?.message === "string" && body.message.trim() ? body.message.trim() : null;

    if (!title) {
        return NextResponse.json({ error: "title is required" }, { status: 400 });
    }

    const { rows } = await db.query(
        'INSERT INTO notification ("projectId", level, title, message, read) VALUES ($1, $2, $3, $4, false) RETURNING id, "projectId", level, title, message, "createdAt"',
        [id, level, title, message]
    );
    return NextResponse.json(rows[0], { status: 201 });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    await db.query('UPDATE notification SET read = true WHERE "projectId" = $1 AND read = false', [id]);
    return NextResponse.json({ ok: true });
}
