"use client";

import { useEffect } from "react";

import { bStore } from "@/hooks/useAppStore";
import type { NextPassInfo } from "@/types/pass";

const UPCOMING_POLL_MS = 5000;
const ACTIVE_POLL_MS = 1000;

type CalendarEventRow = {
    kind: string;
    startsAt: string;
    durationMin: number;
};

function formatDuration(totalSeconds: number) {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
}

function computeNextPass(events: CalendarEventRow[]): NextPassInfo {
    const now = Date.now();
    const passes = events.filter((e) => e.kind === "pass");

    for (const p of passes) {
        const start = new Date(p.startsAt).getTime();
        const end = start + p.durationMin * 60_000;
        if (now >= start && now <= end) {
            const secondsRemaining = Math.round((end - now) / 1000);
            return { status: "active", label: formatDuration(secondsRemaining), secondsRemaining };
        }
    }

    const future = passes
        .map((p) => new Date(p.startsAt).getTime())
        .filter((start) => start > now)
        .sort((a, b) => a - b);

    if (future.length > 0) {
        const secondsRemaining = Math.round((future[0] - now) / 1000);
        return { status: "upcoming", label: formatDuration(secondsRemaining), secondsRemaining };
    }

    return { status: "none", label: "--", secondsRemaining: null };
}

export async function refreshNextPass(projectId: string) {
    const setNextPass = bStore.getState().setNextPass;
    try {
        const r = await fetch(`/api/projects/${projectId}/calendar`, { cache: "no-store" });
        if (!r.ok) {
            setNextPass(null);
            return;
        }
        const rows: CalendarEventRow[] = await r.json();
        setNextPass(computeNextPass(rows));
    } catch {
        setNextPass(null);
    }
}

export function useNextPassPoller(projectId: string | null | undefined) {
    useEffect(() => {
        if (!projectId) return;
        let alive = true;
        let timer: ReturnType<typeof setTimeout>;

        const tick = async () => {
            await refreshNextPass(projectId);
            if (!alive) return;
            const status = bStore.getState().nextPass?.status;
            timer = setTimeout(tick, status === "active" ? ACTIVE_POLL_MS : UPCOMING_POLL_MS);
        };

        tick();
        return () => {
            alive = false;
            clearTimeout(timer);
        };
    }, [projectId]);
}
