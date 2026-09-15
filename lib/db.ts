import { Pool } from "pg";
import { DEFAULT_ADCS_CONFIG } from "@/lib/projects";

function needsSsl(connectionString: string): boolean {
    try {
        const mode = new URL(connectionString).searchParams.get("sslmode");
        return mode === "require" || mode === "verify-ca" || mode === "verify-full";
    } catch {
        return false;
    }
}

function createPool() {
    const connectionString = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
    return connectionString
        ? new Pool({ connectionString, ssl: needsSsl(connectionString) ? { rejectUnauthorized: false } : undefined })
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

let authSchemaReady: Promise<void> | null = null;

export function ensureAuthSchema(): Promise<void> {
    if (!authSchemaReady) {
        authSchemaReady = db
            .query(
                `CREATE TABLE IF NOT EXISTS "user" (
                    id text NOT NULL PRIMARY KEY,
                    name text NOT NULL,
                    email text NOT NULL UNIQUE,
                    "emailVerified" boolean NOT NULL,
                    image text,
                    "createdAt" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
                    "updatedAt" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL
                )`
            )
            .then(() => db.query(
                `CREATE TABLE IF NOT EXISTS session (
                    id text NOT NULL PRIMARY KEY,
                    "expiresAt" timestamptz NOT NULL,
                    token text NOT NULL UNIQUE,
                    "createdAt" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
                    "updatedAt" timestamptz NOT NULL,
                    "ipAddress" text,
                    "userAgent" text,
                    "userId" text NOT NULL REFERENCES "user" (id) ON DELETE CASCADE
                )`
            ))
            .then(() => db.query(
                `CREATE TABLE IF NOT EXISTS account (
                    id text NOT NULL PRIMARY KEY,
                    "accountId" text NOT NULL,
                    "providerId" text NOT NULL,
                    "userId" text NOT NULL REFERENCES "user" (id) ON DELETE CASCADE,
                    "accessToken" text,
                    "refreshToken" text,
                    "idToken" text,
                    "accessTokenExpiresAt" timestamptz,
                    "refreshTokenExpiresAt" timestamptz,
                    scope text,
                    password text,
                    "createdAt" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
                    "updatedAt" timestamptz NOT NULL
                )`
            ))
            .then(() => db.query(
                `CREATE TABLE IF NOT EXISTS verification (
                    id text NOT NULL PRIMARY KEY,
                    identifier text NOT NULL,
                    value text NOT NULL,
                    "expiresAt" timestamptz NOT NULL,
                    "createdAt" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
                    "updatedAt" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL
                )`
            ))
            .then(() => {})
            .catch(() => { authSchemaReady = null; });
    }
    return authSchemaReady;
}

let viewSchemaReady: Promise<void> | null = null;

export function ensureViewSchema(): Promise<void> {
    if (!viewSchemaReady) {
        viewSchemaReady = db
            .query(
                `CREATE TABLE IF NOT EXISTS dashboard_view (
                    id serial PRIMARY KEY,
                    "projectId" text NOT NULL,
                    name text NOT NULL,
                    blocks jsonb NOT NULL DEFAULT '[]',
                    ord integer NOT NULL DEFAULT 0
                )`
            )
            .then(() => db.query("ALTER TABLE dashboard_view ADD COLUMN IF NOT EXISTS icon text DEFAULT 'grid'"))
            .then(() => {})
            .catch(() => { viewSchemaReady = null; });
    }
    return viewSchemaReady;
}

let notificationSchemaReady: Promise<void> | null = null;

export function ensureNotificationSchema(): Promise<void> {
    if (!notificationSchemaReady) {
        notificationSchemaReady = db
            .query(
                `CREATE TABLE IF NOT EXISTS notification (
                    id serial PRIMARY KEY,
                    "projectId" text NOT NULL,
                    level text NOT NULL DEFAULT 'info',
                    title text NOT NULL,
                    message text,
                    read boolean NOT NULL DEFAULT false,
                    "createdAt" timestamptz NOT NULL DEFAULT now()
                )`
            )
            .then(() => {})
            .catch(() => { notificationSchemaReady = null; });
    }
    return notificationSchemaReady;
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
            .then(() => db.query(
                `ALTER TABLE calendar_event ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual'`
            ))
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

let projectSchemaReady: Promise<void> | null = null;

export function ensureProjectSchema(): Promise<void> {
    if (!projectSchemaReady) {
        projectSchemaReady = db
            .query(
                `CREATE TABLE IF NOT EXISTS project (
                    id text PRIMARY KEY,
                    name text NOT NULL,
                    ord integer NOT NULL DEFAULT 0,
                    config jsonb NOT NULL DEFAULT '{}',
                    configured boolean NOT NULL DEFAULT false,
                    "updatedAt" timestamptz NOT NULL DEFAULT now()
                )`
            )
            .then(() => db.query(
                `INSERT INTO project (id, name, ord, config, configured)
                 SELECT 'scalar', 'SCALAR', 0, $1, false
                 WHERE NOT EXISTS (SELECT 1 FROM project)`,
                [JSON.stringify(DEFAULT_ADCS_CONFIG)]
            ))
            .then(() => {})
            .catch(() => { projectSchemaReady = null; });
    }
    return projectSchemaReady;
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
