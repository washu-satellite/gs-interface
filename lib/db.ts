import { Pool } from "pg";

function createPool() {
    const connectionString = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
    return connectionString
        ? new Pool({ connectionString, ssl: { rejectUnauthorized: false } })
        : new Pool({
            user: "postgres",
            host: "localhost",
            port: 5434,
            database: "postgres",
            password: "example",
        });
}

const globalForDb = globalThis as unknown as { _pgPool?: Pool };

export const db = globalForDb._pgPool ?? (globalForDb._pgPool = createPool());
