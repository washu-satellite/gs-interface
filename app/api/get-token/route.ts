import { auth } from "@/auth";
import { headers } from "next/headers";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const secret = process.env.WS_JWT_SIGNING_HASH;
    if (!secret) {
        return NextResponse.json({ error: "Signing not configured" }, { status: 500 });
    }

    const now = Math.floor(Date.now() / 1000);
    const ttlSeconds = 60;
    const token = jwt.sign(
        {
            sub: session.user.id,
            info: { name: session.user.name },
            iat: now,
            exp: now + ttlSeconds,
        },
        secret,
        { algorithm: "HS256" }
    );

    return NextResponse.json({ token, ttl: ttlSeconds });
}
