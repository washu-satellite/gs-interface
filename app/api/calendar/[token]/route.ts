import { db, ensureCalendarSchema } from "@/lib/db";
import { verifyFeedToken } from "@/lib/calendar-feed";
import { buildIcs, type IcalEvent } from "@/lib/ical";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
    const { token } = await params;
    const projectId = await verifyFeedToken(token);
    if (!projectId) {
        return new Response("Invalid or expired calendar token", { status: 403 });
    }

    await ensureCalendarSchema();
    const { rows } = await db.query(
        'SELECT id, kind, title, "startsAt", "durationMin", station, detail FROM calendar_event WHERE "projectId" = $1 ORDER BY "startsAt"',
        [projectId]
    );

    const ics = buildIcs(`${projectId} · Mission Schedule`, rows as IcalEvent[]);

    return new Response(ics, {
        status: 200,
        headers: {
            "Content-Type": "text/calendar; charset=utf-8",
            "Content-Disposition": `inline; filename="${projectId}.ics"`,
            "Cache-Control": "public, max-age=900",
        },
    });
}
