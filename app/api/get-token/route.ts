import { NextResponse } from "next/server";
import { headers } from "next/headers";
import jwt from 'jsonwebtoken';
import { auth } from "@/auth";

export async function GET() {
    let session = null;
    try {
        session = await auth.api.getSession({ headers: await headers() });
    } catch (e) {
        console.error("Failed to resolve session for token request", e);
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    if (!session) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const now = Math.floor(Date.now() / 1000);
    const ttlSeconds = 60;
    const payload = {
        sub: session.user.id,
        info: {
            name: session.user.name
        },
        iat: now,
        exp: now + ttlSeconds
    };

    const secret = process.env.WS_JWT_SIGNING_HASH;
    if (!secret) {
        return NextResponse.json({ error: "Signing failure" }, { status: 401 });
    }

    const token = jwt.sign(payload, secret, { algorithm: 'HS256' });

    return NextResponse.json({ token, ttl: ttlSeconds }, { status: 200 });
}
