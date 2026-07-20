import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const { rows } = await db.query(
        'SELECT id, "projectId", level, title, message, "createdAt" FROM notification WHERE "projectId" = $1 ORDER BY "createdAt" DESC',
        [id]
    );
    return NextResponse.json(rows);
}
