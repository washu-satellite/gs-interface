import { db } from "@/lib/db";
import { verifyLookAngleToken } from "@/lib/look-angle-feed";
import { lookAngle, parseTle } from "@/lib/orbit";
import type { AdcsConfig } from "@/lib/projects";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Unauthenticated (token-authed) endpoint meant for headless consumers like
// gs-pi-routing's rotator.py, which can't hold a browser session. Mirrors
// app/api/calendar/[token]/route.ts's token scheme, in its own secret scope
// (see lib/look-angle-feed.ts).
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
    const { token } = await params;
    const projectId = await verifyLookAngleToken(token);
    if (!projectId) {
        return NextResponse.json({ error: "Invalid or expired token" }, { status: 403 });
    }

    const { rows } = await db.query("SELECT config FROM project WHERE id = $1", [projectId]);
    const cfg = rows[0]?.config as AdcsConfig | undefined;
    if (!cfg?.tleLine1 || !cfg?.tleLine2) {
        return NextResponse.json({ error: "Project has no TLE configured" }, { status: 404 });
    }

    const lat = Number(cfg.stationLat);
    const lon = Number(cfg.stationLon);
    const altKm = Number(cfg.altitudeKm) || 0;
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        return NextResponse.json({ error: "Project has no station location configured" }, { status: 404 });
    }

    const satrec = parseTle(cfg.tleLine1, cfg.tleLine2);
    if (!satrec) {
        return NextResponse.json({ error: "Invalid TLE" }, { status: 422 });
    }

    const now = new Date();
    const angle = lookAngle(satrec, now, {
        latitude: lat * (Math.PI / 180),
        longitude: lon * (Math.PI / 180),
        height: altKm,
    });
    if (!angle) {
        return NextResponse.json({ error: "Could not propagate satellite position" }, { status: 502 });
    }

    return NextResponse.json({
        azimuthDeg: angle.azimuthDeg,
        elevationDeg: angle.elevationDeg,
        rangeKm: angle.rangeKm,
        computedAt: now.toISOString(),
    });
}
