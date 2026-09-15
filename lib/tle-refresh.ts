import { db, ensureProjectSchema } from "@/lib/db";
import { fetchTleFromCelestrak } from "@/lib/tle";
import { computeAndStorePassesForProject } from "@/lib/pass-prediction";
import type { Project } from "@/lib/projects";

export async function refreshTleForAllProjects(): Promise<void> {
    await ensureProjectSchema();
    const { rows } = await db.query(
        `SELECT id, name, ord, config, configured FROM project WHERE configured = true`
    );

    for (const project of rows as Project[]) {
        const noradId = project.config?.noradId?.replace(/\D/g, "");
        if (!noradId) continue;

        const currentLine1NoradId = project.config?.tleLine1?.slice(2, 7).trim();
        if (currentLine1NoradId && currentLine1NoradId !== noradId) {
            console.error(
                `TLE refresh skipped for project ${project.id}: stored noradId (${noradId}) doesn't match the currently-set TLE's own catalog number (${currentLine1NoradId}) — likely a manually pasted TLE for a different object than the NORAD ID field. Refresh would overwrite it with the wrong satellite.`
            );
            continue;
        }

        try {
            const result = await fetchTleFromCelestrak(noradId);
            if (!result.ok) {
                console.error(`TLE refresh failed for project ${project.id}: ${result.error}`);
                continue;
            }
            if (result.line1 === project.config.tleLine1 && result.line2 === project.config.tleLine2) {
                continue;
            }

            await db.query(
                `UPDATE project SET config = config || $1::jsonb, "updatedAt" = now() WHERE id = $2`,
                [JSON.stringify({ tleName: result.name, tleLine1: result.line1, tleLine2: result.line2 }), project.id]
            );

            const { rows: updatedRows } = await db.query(
                `SELECT id, name, ord, config, configured FROM project WHERE id = $1`,
                [project.id]
            );
            const updated = updatedRows[0] as Project | undefined;
            if (updated) await computeAndStorePassesForProject(updated);
        } catch (e) {
            console.error(`TLE refresh failed for project ${project.id}`, e);
        }
    }
}
