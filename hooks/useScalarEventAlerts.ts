"use client";

import { useEffect, useRef } from "react";

import { bStore } from "@/hooks/useAppStore";
import { useSettings } from "@/lib/settings";
import { playNotificationSound } from "@/lib/notification-sound";
import { severityLevel } from "@/lib/scalar-severity";
import { useProject } from "@/components/project-context";

const EVENT_ALERT_MAX_AGE_MS = 30000;

export function useScalarEventAlerts() {
    const scalarEvents = bStore.use.scalarEvents();
    const [settings] = useSettings();
    const { activeProject } = useProject();
    const live = !!activeProject?.config?.live;

    const seen = useRef<Set<number> | null>(null);

    useEffect(() => {
        if (seen.current === null) {
            seen.current = new Set(scalarEvents.map((e) => e.seq));
            return;
        }

        const fresh = scalarEvents.filter((e) => !seen.current!.has(e.seq));
        for (const e of fresh) seen.current!.add(e.seq);

        if (!settings.alertOnTelemetryEvents) return;

        const relevant = fresh.filter((e) => {
            const level = severityLevel(e.severity);
            if (level === "info") return false;
            if (level === "warning" && !settings.notifyWarning) return false;
            if (level === "critical" && !live && !settings.notifyCritical) return false;

            const at = e.time !== null && Number.isFinite(e.time) ? e.time * 1000 : Date.now();
            return Date.now() - at < EVENT_ALERT_MAX_AGE_MS;
        });

        if (relevant.length === 0) return;

        if (settings.desktopNotifications && typeof Notification !== "undefined" && Notification.permission === "granted") {
            for (const e of relevant) {
                new Notification(`${e.severity} — ${e.name}`, {
                    body: e.message,
                    tag: `scalar-event-${e.seq}`,
                });
            }
        }

        if (settings.notificationSound) playNotificationSound();
    }, [
        scalarEvents,
        live,
        settings.alertOnTelemetryEvents,
        settings.desktopNotifications,
        settings.notificationSound,
        settings.notifyWarning,
        settings.notifyCritical,
    ]);
}
