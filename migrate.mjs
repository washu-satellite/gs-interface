import { betterAuth } from "better-auth";
import { Pool } from "pg";
import { getMigrations } from "better-auth/db";

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    port: 5434,
    database: 'postgres',
    password: 'example'
});

const auth = betterAuth({
    database: pool,
    emailAndPassword: { enabled: true }
});

const { runMigrations } = await getMigrations(auth.options);
await runMigrations();
console.log("Migration complete.");
await pool.end();
