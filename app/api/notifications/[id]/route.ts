import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function PATCH(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    await db.query("UPDATE notification SET read = true WHERE id = $1", [id]);
    return NextResponse.json({ ok: true });
}
