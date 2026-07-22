"use client";

import { useEffect, useState } from "react";

export type UnitSystem = "metric" | "imperial";
export type TimeDisplay = "utc" | "local";

export type Settings = {
    notifyInfo: boolean;
    notifyWarning: boolean;
    notifyCritical: boolean;
    desktopNotifications: boolean;
    notificationSound: boolean;
    units: UnitSystem;
    timeDisplay: TimeDisplay;
    precision: number;
    telemetryRefreshMs: number;
    confirmCommands: boolean;
    compactMode: boolean;
};

export const DEFAULT_SETTINGS: Settings = {
    notifyInfo: true,
    notifyWarning: true,
    notifyCritical: true,
    desktopNotifications: false,
    notificationSound: false,
    units: "metric",
    timeDisplay: "utc",
    precision: 2,
    telemetryRefreshMs: 1000,
    confirmCommands: true,
    compactMode: false,
};

const KEY = "gs-settings";
const EVENT = "gs-settings-change";

export function readSettings(): Settings {
    if (typeof window === "undefined") return DEFAULT_SETTINGS;
    try {
        const raw = window.localStorage.getItem(KEY);
        return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
    } catch {
        return DEFAULT_SETTINGS;
    }
}

function writeSettings(next: Settings) {
    try {
        window.localStorage.setItem(KEY, JSON.stringify(next));
        window.dispatchEvent(new CustomEvent<Settings>(EVENT, { detail: next }));
    } catch {
    }
}

export function useSettings(): [Settings, (patch: Partial<Settings>) => void] {
    const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

    useEffect(() => {
        setSettings(readSettings());
        const onCustom = (e: Event) => setSettings((e as CustomEvent<Settings>).detail);
        const onStorage = (e: StorageEvent) => { if (e.key === KEY) setSettings(readSettings()); };
        window.addEventListener(EVENT, onCustom);
        window.addEventListener("storage", onStorage);
        return () => {
            window.removeEventListener(EVENT, onCustom);
            window.removeEventListener("storage", onStorage);
        };
    }, []);

    const update = (patch: Partial<Settings>) => {
        setSettings((prev) => {
            const next = { ...prev, ...patch };
            writeSettings(next);
            return next;
        });
    };

    return [settings, update];
}
