import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

const UPDATER_URL = process.env.UPDATER_URL || "http://updater:8095";
const UPDATER_TRIGGER_KEY = process.env.UPDATER_TRIGGER_KEY || "";

export async function POST() {
    const { response: unauth } = await requireSession();
    if (unauth) return unauth;

    try {
        const res = await fetch(`${UPDATER_URL}/deploy`, {
            method: "POST",
            headers: { "X-Updater-Key": UPDATER_TRIGGER_KEY },
        });
        const data = await res.json().catch(() => ({}));
        return NextResponse.json(data, { status: res.status });
    } catch {
        return NextResponse.json({ error: "Could not reach updater service" }, { status: 502 });
    }
}
