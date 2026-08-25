import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function GET() {
    const { response: unauth } = await requireSession();
    if (unauth) return unauth;

    const { rows } = await db.query(
        'SELECT id, name, ord, config, configured FROM project ORDER BY ord'
    );
    return NextResponse.json(rows);
}
