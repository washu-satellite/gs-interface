import { auth } from "@/auth";
import { db } from "@/lib/db";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function currentUserId() {
    const session = await auth.api.getSession({ headers: await headers() });
    return session?.user?.id ?? null;
}

export async function GET() {
    const id = await currentUserId();
    if (!id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const { rows } = await db.query(
        'SELECT id, name, email, image, "permissionLevel" FROM "user" WHERE id = $1',
        [id]
    );
    return NextResponse.json(rows[0] ?? null);
}

export async function PUT(req: NextRequest) {
    const id = await currentUserId();
    if (!id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const body = await req.json();
    const { rows } = await db.query(
        'UPDATE "user" SET image = $1, "updatedAt" = now() WHERE id = $2 RETURNING id, name, email, image, "permissionLevel"',
        [body.image ?? null, id]
    );
    return NextResponse.json(rows[0]);
}
