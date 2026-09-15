import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

const ACTIONS = new Set(["start", "pause", "resume", "end", "status", "scenarios"]);

function engineBase(): string | null {
    const url = process.env.SIM_ENGINE_URL;
    return url ? url.replace(/\/$/, "") : null;
}

function engineHeaders(json = false): Record<string, string> {
    const headers: Record<string, string> = {};
    if (json) headers["Content-Type"] = "application/json";
    const key = process.env.SIM_ENGINE_API_KEY;
    if (key) headers["Authorization"] = `Bearer ${key}`;
    return headers;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ action: string }> }) {
    const { response: unauth } = await requireSession();
    if (unauth) return unauth;

    const { action } = await params;
    if (!ACTIONS.has(action)) return NextResponse.json({ error: "Unknown action" }, { status: 404 });
    const base = engineBase();
    if (!base) return NextResponse.json({ error: "Simulation engine not configured", configured: false }, { status: 503 });
    try {
        const res = await fetch(`${base}/${action}`, { cache: "no-store", headers: engineHeaders() });
        const data = await res.json().catch(() => ({}));
        return NextResponse.json(data, { status: res.status });
    } catch {
        return NextResponse.json({ error: "Simulation engine unreachable", configured: true, reachable: false }, { status: 502 });
    }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ action: string }> }) {
    const { response: unauth } = await requireSession();
    if (unauth) return unauth;

    const { action } = await params;
    if (!ACTIONS.has(action)) return NextResponse.json({ error: "Unknown action" }, { status: 404 });
    const base = engineBase();
    if (!base) return NextResponse.json({ error: "Simulation engine not configured", configured: false }, { status: 503 });
    const body = await req.text();
    try {
        const res = await fetch(`${base}/${action}`, { method: "POST", cache: "no-store", headers: engineHeaders(true), body });
        const data = await res.json().catch(() => ({}));
        return NextResponse.json(data, { status: res.status });
    } catch {
        return NextResponse.json({ error: "Simulation engine unreachable", configured: true, reachable: false }, { status: 502 });
    }
}
