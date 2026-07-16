import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { Pool } from "pg";

export const auth = betterAuth({
    database: new Pool({
        user: 'postgres',
        host: 'localhost',
        port: 5434,
        database: 'postgres',
        password: 'example'
    }),
    emailAndPassword: {
        enabled: true
    },
    // Allow requests coming through the demo tunnel (Cloudflare quick tunnels
    // hand out *.trycloudflare.com hostnames). Without this, better-auth
    // rejects sign-in/sign-up with an "invalid origin" error.
    trustedOrigins: [
        "http://localhost:3000",
        "https://*.trycloudflare.com",
    ],
    plugins: [nextCookies()]
});