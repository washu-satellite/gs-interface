import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

const UPDATER_URL = process.env.UPDATER_URL || "http://updater:8095";
const UPDATER_TRIGGER_KEY = process.env.UPDATER_TRIGGER_KEY || "";

export async function GET() {
    const { response: unauth } = await requireSession();
    if (unauth) return unauth;

    try {
        const res = await fetch(`${UPDATER_URL}/status`, {
            headers: { "X-Updater-Key": UPDATER_TRIGGER_KEY },
            cache: "no-store",
        });
        if (!res.ok) {
            return NextResponse.json({ error: `updater responded ${res.status}` }, { status: 502 });
        }
        return NextResponse.json(await res.json());
    } catch {
        return NextResponse.json({ error: "Could not reach updater service" }, { status: 502 });
    }
}
