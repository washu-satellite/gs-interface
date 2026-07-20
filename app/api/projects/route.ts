import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
    const { rows } = await db.query(
        'SELECT id, name, ord, config, configured FROM project ORDER BY ord'
    );
    return NextResponse.json(rows);
}
