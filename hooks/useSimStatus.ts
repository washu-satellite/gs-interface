"use client";

import { useEffect } from "react";

import { bStore } from "@/hooks/useAppStore";

const POLL_MS = 2500;

export async function refreshSimStatus() {
    const setSimStatus = bStore.getState().setSimStatus;
    try {
        const res = await fetch("/api/sim/status", { cache: "no-store" });
        if (res.status === 503) return setSimStatus(null, "unconfigured");
        if (res.status === 502) return setSimStatus(null, "unreachable");

        const data = await res.json().catch(() => null);
        if (!res.ok || !data) return setSimStatus(null, "unreachable");

        setSimStatus(data, "ok");
    } catch {
        setSimStatus(null, "unreachable");
    }
}

export function useSimStatusPoller() {
    useEffect(() => {
        refreshSimStatus();
        const iv = setInterval(refreshSimStatus, POLL_MS);
        return () => clearInterval(iv);
    }, []);
}
