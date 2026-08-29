import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { Pool } from "pg";

// Use a cloud database when a connection string is provided (e.g. Neon on
// Vercel, injected as DATABASE_URL / POSTGRES_URL). Cloud Postgres requires
// SSL; a self-hosted Postgres (e.g. the docker-compose one) generally doesn't,
// so SSL is only forced when the connection string itself asks for it.
// Fall back to the local Docker Postgres for development.
const connectionString = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;

function needsSsl(cs: string): boolean {
    try {
        const mode = new URL(cs).searchParams.get("sslmode");
        return mode === "require" || mode === "verify-ca" || mode === "verify-full";
    } catch {
        return false;
    }
}

const pool = connectionString
    ? new Pool({ connectionString, ssl: needsSsl(connectionString) ? { rejectUnauthorized: false } : undefined })
    : new Pool({
        user: "postgres",
        host: "localhost",
        port: 5434,
        database: "postgres",
        password: "example",
    });

export const auth = betterAuth({
    database: pool,
    emailAndPassword: {
        enabled: true
    },
    // Allow requests from the local dev server, the Cloudflare quick-tunnel
    // demo hosts, and the Vercel deployment. Without a matching entry
    // better-auth rejects sign-in/sign-up with an "invalid origin" error.
    trustedOrigins: [
        "http://localhost:3000",
        "https://*.trycloudflare.com",
        "https://*.vercel.app",
    ],
    plugins: [nextCookies()]
});