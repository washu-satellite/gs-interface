import { db, ensureCalendarSchema, ensureProjectSchema } from "@/lib/db";
import { computePasses, parseTle } from "@/lib/orbit";
import type { Project } from "@/lib/projects";

const LOOKAHEAD_HOURS = 48;
const MIN_ELEVATION_DEG = 10;

export async function computeAndStorePassesForProject(project: Project): Promise<number> {
    const cfg = project.config;
    if (!cfg?.tleLine1 || !cfg?.tleLine2) return 0;

    const lat = Number(cfg.stationLat);
    const lon = Number(cfg.stationLon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return 0;

    const satrec = parseTle(cfg.tleLine1, cfg.tleLine2);
    if (!satrec) return 0;

    const now = new Date();
    const until = new Date(now.getTime() + LOOKAHEAD_HOURS * 60 * 60 * 1000);
    const passes = computePasses(satrec, { latDeg: lat, lonDeg: lon, altKm: 0 }, now, until, MIN_ELEVATION_DEG);

    await ensureCalendarSchema();
    await db.query(
        `DELETE FROM calendar_event
         WHERE "projectId" = $1 AND kind = 'pass' AND source = 'computed' AND "startsAt" > now()`,
        [project.id]
    );

    for (const p of passes) {
        const durationMin = Math.max(1, Math.round((p.end.getTime() - p.start.getTime()) / 60000));
        await db.query(
            `INSERT INTO calendar_event ("projectId", kind, title, "startsAt", "durationMin", station, detail, source)
             VALUES ($1, 'pass', $2, $3, $4, $5, $6, 'computed')`,
            [
                project.id,
                `Pass (max elev ${Math.round(p.maxElevationDeg)}°)`,
                p.start.toISOString(),
                durationMin,
                cfg.stationCallsign ?? null,
                `Predicted via SGP4 against ${cfg.stationLat}, ${cfg.stationLon}. Max elevation ${p.maxElevationDeg.toFixed(1)} degrees, ${MIN_ELEVATION_DEG} degree cutoff.`,
            ]
        );
    }
    return passes.length;
}

export async function computeAndStorePassesForAllProjects(): Promise<void> {
    await ensureCalendarSchema();
    await ensureProjectSchema();
    const { rows } = await db.query(
        `SELECT id, name, ord, config, configured FROM project WHERE configured = true`
    );
    for (const project of rows as Project[]) {
        try {
            await computeAndStorePassesForProject(project);
        } catch (e) {
            console.error(`pass prediction failed for project ${project.id}`, e);
        }
    }
}
