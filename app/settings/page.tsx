"use client";

import { ReactNode, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { bStore } from "@/hooks/useAppStore";
import { useSettings } from "@/lib/settings";
import { ProjectProvider, useProject } from "@/components/project-context";
import { authClient } from "@/lib/auth-client";
import {
    ArrowLeft,
    Bell,
    Gauge,
    Moon,
    Palette,
    ShieldAlert,
    Sun,
    Terminal,
    TriangleAlert,
    User,
} from "lucide-react";

function Section(props: { icon: ReactNode; title: string; description?: string; children: ReactNode }) {
    return (
        <div className="rounded-lg border bg-background">
            <div className="flex flex-row items-start gap-3 border-b px-5 py-4">
                <div className="mt-0.5 text-muted-foreground">{props.icon}</div>
                <div className="flex flex-col gap-0.5">
                    <h2 className="font-semibold">{props.title}</h2>
                    {props.description && <p className="text-sm text-muted-foreground">{props.description}</p>}
                </div>
            </div>
            <div className="flex flex-col divide-y">{props.children}</div>
        </div>
    );
}

function Row(props: { label: string; hint?: string; control: ReactNode }) {
    return (
        <div className="flex flex-row items-center justify-between gap-6 px-5 py-3.5">
            <div className="flex flex-col gap-0.5 min-w-0">
                <Label className="font-medium">{props.label}</Label>
                {props.hint && <p className="text-xs text-muted-foreground">{props.hint}</p>}
            </div>
            <div className="shrink-0">{props.control}</div>
        </div>
    );
}

function Segmented<T extends string>(props: {
    value: T;
    onChange: (v: T) => void;
    options: { value: T; label: ReactNode }[];
}) {
    return (
        <div className="inline-flex rounded-md border bg-secondary/40 p-0.5">
            {props.options.map((o) => (
                <button
                    key={o.value}
                    onClick={() => props.onChange(o.value)}
                    className={cn(
                        "flex items-center gap-1.5 rounded px-3 py-1 text-sm cursor-pointer transition-colors",
                        props.value === o.value
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                    )}
                >
                    {o.label}
                </button>
            ))}
        </div>
    );
}

function SettingsBody() {
    const router = useRouter();
    const theme = bStore.use.theme();
    const setTheme = bStore.use.setTheme();
    const [settings, update] = useSettings();
    const { notifications, clearNotifications, pushNotification } = useProject();
    const [busy, setBusy] = useState(false);

    const requestDesktop = async (on: boolean) => {
        if (on && typeof Notification !== "undefined" && Notification.permission !== "granted") {
            const perm = await Notification.requestPermission();
            update({ desktopNotifications: perm === "granted" });
            return;
        }
        update({ desktopNotifications: on });
    };

    return (
        <div className="min-h-screen bg-secondary/40 dark:bg-secondary/20 p-6">
            <div className="mx-auto w-full max-w-2xl flex flex-col gap-6">
                <div className="flex flex-row items-center justify-between">
                    <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/adcs")}>
                        <ArrowLeft className="w-4 h-4" /> Back to dashboard
                    </Button>
                    <h1 className="text-lg font-semibold">Settings</h1>
                </div>

                <Section icon={<Palette className="w-4 h-4" />} title="Appearance" description="Theme and layout density.">
                    <Row
                        label="Theme"
                        hint="Switch between light and dark console themes."
                        control={
                            <Segmented
                                value={theme}
                                onChange={(v) => setTheme(v)}
                                options={[
                                    { value: "light", label: <><Sun className="w-3.5 h-3.5" /> Light</> },
                                    { value: "dark", label: <><Moon className="w-3.5 h-3.5" /> Dark</> },
                                ]}
                            />
                        }
                    />
                    <Row
                        label="Compact mode"
                        hint="Tighter spacing for dense telemetry layouts."
                        control={<Checkbox checked={settings.compactMode} onCheckedChange={(c) => update({ compactMode: c === true })} />}
                    />
                </Section>

                <Section icon={<Bell className="w-4 h-4" />} title="Notifications" description="Choose which alerts surface and how.">
                    <Row
                        label="Info notifications"
                        control={<Checkbox checked={settings.notifyInfo} onCheckedChange={(c) => update({ notifyInfo: c === true })} />}
                    />
                    <Row
                        label="Warning notifications"
                        control={<Checkbox checked={settings.notifyWarning} onCheckedChange={(c) => update({ notifyWarning: c === true })} />}
                    />
                    <Row
                        label="Critical notifications"
                        hint="Critical alerts cannot be muted while live."
                        control={<Checkbox checked disabled />}
                    />
                    <Row
                        label="Desktop notifications"
                        hint="Show OS-level notifications for new alerts."
                        control={<Checkbox checked={settings.desktopNotifications} onCheckedChange={(c) => requestDesktop(c === true)} />}
                    />
                    <Row
                        label="Notification sound"
                        control={<Checkbox checked={settings.notificationSound} onCheckedChange={(c) => update({ notificationSound: c === true })} />}
                    />
                    <Row
                        label="Manage alerts"
                        hint={`${notifications.length} active notification${notifications.length === 1 ? "" : "s"}.`}
                        control={
                            <div className="flex flex-row gap-2">
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    disabled={busy}
                                    onClick={async () => {
                                        setBusy(true);
                                        await pushNotification({ level: "info", title: "Test notification", message: "Notifications are wired up correctly." });
                                        setBusy(false);
                                    }}
                                >
                                    Send test
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    disabled={busy || notifications.length === 0}
                                    onClick={async () => {
                                        setBusy(true);
                                        await clearNotifications();
                                        setBusy(false);
                                    }}
                                >
                                    Clear all
                                </Button>
                            </div>
                        }
                    />
                </Section>

                <Section icon={<Gauge className="w-4 h-4" />} title="Telemetry & Units" description="How mission data is displayed.">
                    <Row
                        label="Units"
                        control={
                            <Segmented
                                value={settings.units}
                                onChange={(v) => update({ units: v })}
                                options={[
                                    { value: "metric", label: "Metric" },
                                    { value: "imperial", label: "Imperial" },
                                ]}
                            />
                        }
                    />
                    <Row
                        label="Time display"
                        hint="Timestamps across views and the calendar."
                        control={
                            <Segmented
                                value={settings.timeDisplay}
                                onChange={(v) => update({ timeDisplay: v })}
                                options={[
                                    { value: "utc", label: "UTC" },
                                    { value: "local", label: "Local" },
                                ]}
                            />
                        }
                    />
                    <Row
                        label={`Numeric precision · ${settings.precision} dp`}
                        hint="Decimal places for channel values."
                        control={
                            <div className="w-40">
                                <Slider
                                    min={0}
                                    max={6}
                                    step={1}
                                    value={[settings.precision]}
                                    onValueChange={([v]) => update({ precision: v })}
                                />
                            </div>
                        }
                    />
                    <Row
                        label="Refresh interval"
                        hint="How often live telemetry redraws."
                        control={
                            <Segmented
                                value={String(settings.telemetryRefreshMs)}
                                onChange={(v) => update({ telemetryRefreshMs: Number(v) })}
                                options={[
                                    { value: "250", label: "0.25s" },
                                    { value: "500", label: "0.5s" },
                                    { value: "1000", label: "1s" },
                                    { value: "5000", label: "5s" },
                                ]}
                            />
                        }
                    />
                </Section>

                <Section icon={<ShieldAlert className="w-4 h-4" />} title="Command & Safety" description="Guards for operator actions.">
                    <Row
                        label="Confirm before sending commands"
                        hint="Require an extra confirmation for uplinked commands."
                        control={<Checkbox checked={settings.confirmCommands} onCheckedChange={(c) => update({ confirmCommands: c === true })} />}
                    />
                    <Row
                        label="Operator licensing"
                        control={
                            <Badge className="gap-1 bg-amber-500/15 text-amber-500 border-amber-500/30">
                                <TriangleAlert className="w-3 h-3" /> Unlicensed
                            </Badge>
                        }
                    />
                </Section>

                <Section icon={<User className="w-4 h-4" />} title="Account" description="Profile and session.">
                    <Row
                        label="Profile"
                        hint="Manage your name, avatar, and permissions."
                        control={<Button variant="secondary" size="sm" onClick={() => router.push("/profile")}>Open profile</Button>}
                    />
                    <Row
                        label="Sign out"
                        control={
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={async () => {
                                    await authClient.signOut();
                                    router.push("/sign-in");
                                }}
                            >
                                Sign out
                            </Button>
                        }
                    />
                </Section>

                <Section icon={<Terminal className="w-4 h-4" />} title="About">
                    <Row label="Ground Station Interface" control={<span className="text-sm text-muted-foreground font-mono">v2.1.0</span>} />
                </Section>
            </div>
        </div>
    );
}

export default function SettingsPage() {
    return (
        <ProjectProvider>
            <SettingsBody />
        </ProjectProvider>
    );
}
