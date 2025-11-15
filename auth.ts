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
    plugins: [nextCookies()]
});