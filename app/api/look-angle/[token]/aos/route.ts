import { db } from "@/lib/db";
import { verifyLookAngleToken } from "@/lib/look-angle-feed";
import { MIN_ELEVATION_DEG, parseTle, secondsUntilVisible } from "@/lib/orbit";
import type { AdcsConfig } from "@/lib/projects";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const WINDOW_SEC = 120;

// Token-authed (same token as /api/look-angle/[token]) endpoint answering
// "will this project's satellite be overhead in the next couple minutes,
// and if so, when?" -- for headless consumers like gs-pi-routing/overhead.py
// that just want a quick yes/no + ETA, not a live-tracking feed.
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
    const etaSeconds = secondsUntilVisible(
        satrec,
        { latitude: lat * (Math.PI / 180), longitude: lon * (Math.PI / 180), height: altKm },
        now,
        WINDOW_SEC
    );

    return NextResponse.json({
        noradId: cfg.noradId || null,
        etaSeconds,
        windowSec: WINDOW_SEC,
        minElevationDeg: MIN_ELEVATION_DEG,
        computedAt: now.toISOString(),
    });
}
