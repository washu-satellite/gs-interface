import { db, ensureCommandQueueSettingsSchema } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { response: unauth } = await requireSession();
    if (unauth) return unauth;

    const { id } = await params;
    await ensureCommandQueueSettingsSchema();
    const { rows } = await db.query(
        `SELECT "autoRelease" FROM command_queue_settings WHERE "projectId" = $1`,
        [id]
    );
    return NextResponse.json({ autoRelease: rows[0]?.autoRelease ?? false });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { response: unauth } = await requireSession();
    if (unauth) return unauth;

    const { id } = await params;
    await ensureCommandQueueSettingsSchema();
    const body = await req.json().catch(() => ({}));
    const autoRelease = body?.autoRelease === true;

    await db.query(
        `INSERT INTO command_queue_settings ("projectId", "autoRelease", "updatedAt")
         VALUES ($1, $2, now())
         ON CONFLICT ("projectId") DO UPDATE SET "autoRelease" = $2, "updatedAt" = now()`,
        [id, autoRelease]
    );
    return NextResponse.json({ autoRelease });
}
