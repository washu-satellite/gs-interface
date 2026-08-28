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

let commandQueueSchemaReady: Promise<void> | null = null;

export function ensureCommandQueueSchema(): Promise<void> {
    if (!commandQueueSchemaReady) {
        commandQueueSchemaReady = db
            .query(
                `CREATE TABLE IF NOT EXISTS command_queue (
                    id serial PRIMARY KEY,
                    "projectId" text NOT NULL,
                    mnemonic text NOT NULL,
                    args jsonb NOT NULL DEFAULT '[]',
                    "queuedBy" text NOT NULL,
                    "queuedByName" text,
                    "createdAt" timestamptz NOT NULL DEFAULT now()
                )`
            )
            .then(() => db.query(
                `ALTER TABLE command_queue
                    ALTER COLUMN mnemonic DROP NOT NULL,
                    ALTER COLUMN args DROP NOT NULL,
                    ADD COLUMN IF NOT EXISTS ord integer NOT NULL DEFAULT 0,
                    ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'command',
                    ADD COLUMN IF NOT EXISTS "blockType" text,
                    ADD COLUMN IF NOT EXISTS "blockConfig" jsonb,
                    ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'queued',
                    ADD COLUMN IF NOT EXISTS error text`
            ))
            .then(() => {})
            .catch(() => { commandQueueSchemaReady = null; });
    }
    return commandQueueSchemaReady;
}

let commandQueueSettingsSchemaReady: Promise<void> | null = null;

export function ensureCommandQueueSettingsSchema(): Promise<void> {
    if (!commandQueueSettingsSchemaReady) {
        commandQueueSettingsSchemaReady = db
            .query(
                `CREATE TABLE IF NOT EXISTS command_queue_settings (
                    "projectId" text PRIMARY KEY,
                    "autoRelease" boolean NOT NULL DEFAULT false,
                    "updatedAt" timestamptz NOT NULL DEFAULT now()
                )`
            )
            .then(() => {})
            .catch(() => { commandQueueSettingsSchemaReady = null; });
    }
    return commandQueueSettingsSchemaReady;
}
