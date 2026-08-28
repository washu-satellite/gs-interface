import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { response: unauth } = await requireSession();
    if (unauth) return unauth;

    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const since = searchParams.get("since");
    const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 500, 1), 2000);

    const sinceClause = since ? `AND "receivedAt" > $2` : "";
    const args = since ? [id, since] : [id];

    const [channels, events] = await Promise.all([
        db.query(
            `SELECT "channelId" as id, name, value, text, "spacecraftTime" as time, "receivedAt"
             FROM scalar_telemetry_log WHERE "projectId" = $1 ${sinceClause}
             ORDER BY "receivedAt" DESC LIMIT ${limit}`,
            args
        ).catch(() => ({ rows: [] })),
        db.query(
            `SELECT "eventId" as id, name, severity, message, "spacecraftTime" as time, "receivedAt"
             FROM scalar_event_log WHERE "projectId" = $1 ${sinceClause}
             ORDER BY "receivedAt" DESC LIMIT ${limit}`,
            args
        ).catch(() => ({ rows: [] })),
    ]);

    return NextResponse.json({
        channels: channels.rows.reverse(),
        events: events.rows.reverse(),
    });
}
