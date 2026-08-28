"use client";

import { useEffect } from "react";

import { bStore } from "@/hooks/useAppStore";

const POLL_MS = 5000;

export async function refreshBridgeHealth() {
    const setBridgeHealth = bStore.getState().setBridgeHealth;
    try {
        const res = await fetch("/api/scalar/health", { cache: "no-store" });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data) {
            setBridgeHealth({ status: "unreachable", secondsSinceLastData: null });
            return;
        }
        setBridgeHealth({ status: data.status, secondsSinceLastData: data.secondsSinceLastData ?? null });
    } catch {
        setBridgeHealth({ status: "unreachable", secondsSinceLastData: null });
    }
}

export function useScalarBridgeHealthPoller() {
    useEffect(() => {
        refreshBridgeHealth();
        const iv = setInterval(refreshBridgeHealth, POLL_MS);
        return () => clearInterval(iv);
    }, []);
}
