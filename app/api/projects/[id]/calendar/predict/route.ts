import { db, ensureProjectSchema } from "@/lib/db";
import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { computeAndStorePassesForProject } from "@/lib/pass-prediction";
import type { Project } from "@/lib/projects";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { response: unauth } = await requireSession();
    if (unauth) return unauth;

    await ensureProjectSchema();
    const { id } = await params;
    const { rows } = await db.query(
        `SELECT id, name, ord, config, configured FROM project WHERE id = $1`,
        [id]
    );
    const project = rows[0] as Project | undefined;
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const count = await computeAndStorePassesForProject(project);
    return NextResponse.json({ passes: count });
}
