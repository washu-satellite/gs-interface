import { db, ensureCalendarSchema } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

const KINDS = ["pass", "downlink", "maneuver", "maintenance", "anomaly", "planning", "misc"];

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { response: unauth } = await requireSession();
    if (unauth) return unauth;

    const { id } = await params;
    await ensureCalendarSchema();
    const { rows } = await db.query(
        'SELECT id, "projectId", kind, title, "startsAt", "durationMin", station, detail FROM calendar_event WHERE "projectId" = $1 ORDER BY "startsAt"',
        [id]
    );
    return NextResponse.json(rows);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { response: unauth } = await requireSession();
    if (unauth) return unauth;

    const { id } = await params;
    await ensureCalendarSchema();
    const body = await req.json().catch(() => ({}));

    const kind: string = KINDS.includes(body?.kind) ? body.kind : "misc";
    const title: string = typeof body?.title === "string" ? body.title.trim().slice(0, 200) : "";
    const startsAt = body?.startsAt ? new Date(body.startsAt) : null;
    const durationMin = Number.isFinite(body?.durationMin) ? Math.max(1, Math.round(body.durationMin)) : 10;
    const station: string | null = typeof body?.station === "string" && body.station.trim() ? body.station.trim().slice(0, 60) : null;
    const detail: string | null = typeof body?.detail === "string" && body.detail.trim() ? body.detail.trim().slice(0, 2000) : null;

    if (!title) return NextResponse.json({ error: "title is required" }, { status: 400 });
    if (!startsAt || Number.isNaN(startsAt.getTime())) return NextResponse.json({ error: "valid startsAt is required" }, { status: 400 });

    const { rows } = await db.query(
        `INSERT INTO calendar_event ("projectId", kind, title, "startsAt", "durationMin", station, detail)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, "projectId", kind, title, "startsAt", "durationMin", station, detail`,
        [id, kind, title, startsAt.toISOString(), durationMin, station, detail]
    );
    return NextResponse.json(rows[0], { status: 201 });
}
