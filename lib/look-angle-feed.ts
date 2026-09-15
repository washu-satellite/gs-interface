import { createHmac, timingSafeEqual, randomBytes } from "crypto";
import { db } from "./db";

// Mirrors lib/calendar-feed.ts's token scheme, kept as its own secret scope
// so a token handed to a calendar app can't also be used to read live
// antenna pointing data, and vice versa.

let cachedSecret: string | null = null;
let secretPromise: Promise<string> | null = null;

async function loadSecret(): Promise<string> {
    const env = process.env.LOOK_ANGLE_FEED_SECRET;
    if (env) return env;
    await db.query("CREATE TABLE IF NOT EXISTS app_secret (key text PRIMARY KEY, value text NOT NULL)");
    const generated = randomBytes(32).toString("base64url");
    const { rows } = await db.query(
        `INSERT INTO app_secret (key, value) VALUES ('look_angle_feed', $1)
         ON CONFLICT (key) DO UPDATE SET value = app_secret.value
         RETURNING value`,
        [generated]
    );
    return rows[0].value;
}

function getSecret(): Promise<string> {
    if (cachedSecret) return Promise.resolve(cachedSecret);
    if (!secretPromise) {
        secretPromise = loadSecret()
            .then((s) => { cachedSecret = s; return s; })
            .catch((e) => { secretPromise = null; throw e; });
    }
    return secretPromise;
}

function b64url(input: string) {
    return Buffer.from(input, "utf8").toString("base64url");
}

function macFor(payload: string, secret: string) {
    return createHmac("sha256", secret).update(payload).digest("base64url").slice(0, 24);
}

export async function signLookAngleToken(projectId: string): Promise<string> {
    const secret = await getSecret();
    const payload = b64url(projectId);
    return `${payload}.${macFor(payload, secret)}`;
}

export async function verifyLookAngleToken(token: string): Promise<string | null> {
    const secret = await getSecret();
    const dot = token.lastIndexOf(".");
    if (dot <= 0) return null;
    const payload = token.slice(0, dot);
    const mac = token.slice(dot + 1);
    const expected = macFor(payload, secret);
    if (mac.length !== expected.length) return null;
    try {
        if (!timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return null;
        return Buffer.from(payload, "base64url").toString("utf8");
    } catch {
        return null;
    }
}
