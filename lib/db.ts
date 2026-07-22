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

let viewSchemaReady: Promise<void> | null = null;

export function ensureViewSchema(): Promise<void> {
    if (!viewSchemaReady) {
        viewSchemaReady = db
            .query("ALTER TABLE dashboard_view ADD COLUMN IF NOT EXISTS icon text DEFAULT 'grid'")
            .then(() => {})
            .catch(() => { viewSchemaReady = null; });
    }
    return viewSchemaReady;
}

let calendarSchemaReady: Promise<void> | null = null;

export function ensureCalendarSchema(): Promise<void> {
    if (!calendarSchemaReady) {
        calendarSchemaReady = db
            .query(
                `CREATE TABLE IF NOT EXISTS calendar_event (
                    id serial PRIMARY KEY,
                    "projectId" text NOT NULL,
                    kind text NOT NULL DEFAULT 'misc',
                    title text NOT NULL,
                    "startsAt" timestamptz NOT NULL,
                    "durationMin" integer NOT NULL DEFAULT 10,
                    station text,
                    detail text
                )`
            )
            .then(() => {})
            .catch(() => { calendarSchemaReady = null; });
    }
    return calendarSchemaReady;
}
