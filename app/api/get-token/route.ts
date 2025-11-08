import { NextApiRequest, NextApiResponse } from "next";
import jwt from 'jsonwebtoken';
import { NextResponse } from "next/server";

async function getUserFromReq(req: NextApiRequest) {
    return { name: "Someone", id: "asdasdasd" };
}

export async function GET(req: NextApiRequest) {
    const user = await getUserFromReq(req);

    console.log(user);

    if (!user)
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    
    const now = Math.floor(Date.now() / 1000);
    const ttlSeconds = 60;
    const payload = {
        sub: user.id,
        info: {
            name: user.name
        },
        iat: now,
        exp: now + ttlSeconds
    };

    const secret = process.env.WS_JWT_SIGNING_HASH;
    if (secret === undefined)
        return NextResponse.json({ error: "Signing failure" }, { status: 401 });

    const token = jwt.sign(payload, secret, { algorithm: 'HS256' });

    return NextResponse.json({ token, ttl: ttlSeconds }, { status: 200 });
}