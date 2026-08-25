"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useProject } from "@/components/project-context";
import { bStore } from "@/hooks/useAppStore";
import { refreshSimStatus } from "@/hooks/useSimStatus";
import {
    SIM_SCENARIOS,
    SIM_DURATION_MIN,
    SIM_DURATION_MAX,
    type SimScenario,
} from "@/lib/sim-scenarios";
import { ChevronRight, Play, Pause, Square, TriangleAlert, FlaskConical, Loader2 } from "lucide-react";

const DURATION_PRESETS = [
    { label: "10m", min: 10 },
    { label: "1h", min: 60 },
    { label: "3h", min: 180 },
    { label: "6h", min: 360 },
    { label: "12h", min: 720 },
];

function fmtElapsed(sec: number) {
    const s = Math.max(0, Math.floor(sec));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

export default function SimulationView() {
    const { activeProject } = useProject();
    const missionLive = !!activeProject?.config?.live;

    const engine = bStore.use.simEngine();
    const status = bStore.use.simStatus();
    const [busy, setBusy] = React.useState(false);
    const [expanded, setExpanded] = React.useState<Set<string>>(new Set());

    const [params, setParams] = React.useState<Record<string, Record<string, string | number>>>(() => {
        const init: Record<string, Record<string, string | number>> = {};
        for (const s of SIM_SCENARIOS) {
            init[s.id] = {};
            for (const p of s.params) init[s.id][p.key] = p.default;
        }
        return init;
    });
    const [durations, setDurations] = React.useState<Record<string, number>>(() =>
        Object.fromEntries(SIM_SCENARIOS.map((s) => [s.id, s.defaultDurationMin]))
    );

    const post = async (action: string, body: unknown) => {
        setBusy(true);
        try {
            await fetch(`/api/sim/${action}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
        } catch {
        } finally {
            setBusy(false);
            refreshSimStatus();
        }
    };

    const start = (s: SimScenario) => post("start", { scenarioId: s.id, params: params[s.id], durationMin: durations[s.id] });
    const resume = () => post("resume", { runId: status?.runId });
    const pause = () => post("pause", { runId: status?.runId });
    const end = () => post("end", { runId: status?.runId });

    const toggle = (id: string) =>
        setExpanded((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });

    const setParam = (sid: string, key: string, value: string | number) =>
        setParams((prev) => ({ ...prev, [sid]: { ...prev[sid], [key]: value } }));

    const setDuration = (sid: string, min: number) =>
        setDurations((prev) => ({ ...prev, [sid]: Math.max(SIM_DURATION_MIN, Math.min(SIM_DURATION_MAX, Math.round(min) || SIM_DURATION_MIN)) }));

    const activeScenario = status?.active ? SIM_SCENARIOS.find((s) => s.id === status.scenarioId) : null;
    const progress = status?.active && status.durationMin
        ? Math.min(100, ((status.elapsedSec ?? 0) / (status.durationMin * 60)) * 100)
        : 0;

    return (
        <div className="flex flex-col gap-4 h-full min-h-0">
            {status?.active && (
                <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-3 flex flex-col gap-2">
                    <div className="flex flex-row items-center justify-between gap-3">
                        <div className="flex flex-row items-center gap-2 text-amber-500">
                            <FlaskConical className="w-4 h-4" />
                            <span className="font-semibold text-sm uppercase tracking-wide">Simulation active</span>
                            <span className="text-foreground font-medium">{activeScenario?.name ?? status.scenarioId}</span>
                            <span className="text-xs text-muted-foreground uppercase">{status.state}</span>
                        </div>
                        <span className="font-mono text-sm text-muted-foreground">
                            {fmtElapsed(status.elapsedSec ?? 0)} / {fmtElapsed((status.durationMin ?? 0) * 60)}
                        </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-amber-500/20 overflow-hidden">
                        <div className="h-full bg-amber-500 transition-all" style={{ width: `${progress}%` }} />
                    </div>
                    <p className="text-xs text-muted-foreground">Simulated telemetry is being injected into the live SCALAR pane, ADCS panel, and dashboards.</p>
                </div>
            )}

            {missionLive && (
                <div className="rounded-lg border border-red-500/50 bg-red-950/30 px-4 py-2.5 flex flex-row items-center gap-2 text-red-400">
                    <TriangleAlert className="w-4 h-4 shrink-0" />
                    <p className="text-sm">A live mission session is active — simulations are disabled to avoid mixing simulated data with real flight telemetry.</p>
                </div>
            )}

            {engine !== "ok" && engine !== "loading" && (
                <div className="rounded-lg border px-4 py-2.5 flex flex-row items-center gap-2 text-muted-foreground">
                    <TriangleAlert className="w-4 h-4 shrink-0" />
                    <p className="text-sm">
                        {engine === "unconfigured"
                            ? "Simulation engine not configured. Set SIM_ENGINE_URL to point at the running sim engine."
                            : "Simulation engine unreachable. Check that the sim engine is running and reachable from the server."}
                    </p>
                </div>
            )}

            <div className="rounded-md border divide-y overflow-y-auto min-h-0">
                {SIM_SCENARIOS.map((s) => {
                    const isActive = status?.active && status.scenarioId === s.id;
                    const isRunning = isActive && status?.state === "running";
                    const isPaused = isActive && status?.state === "paused";
                    const anotherActive = !!status?.active && status.scenarioId !== s.id;
                    const isOpen = expanded.has(s.id);

                    const startDisabled = busy || engine !== "ok" || missionLive || anotherActive || isRunning;

                    return (
                        <div key={s.id} className={cn(isActive && "bg-amber-500/[0.06]")}>
                            <div className="flex flex-row items-center gap-3 px-3 py-2.5">
                                <button
                                    onClick={() => toggle(s.id)}
                                    className="p-1 -m-1 rounded text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
                                    aria-label={isOpen ? "Collapse" : "Expand"}
                                >
                                    <ChevronRight className={cn("w-4 h-4 transition-transform", isOpen && "rotate-90")} />
                                </button>
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-row items-center gap-2">
                                        <h3 className="font-medium truncate">{s.name}</h3>
                                        {isActive && (
                                            <span className="text-[0.65rem] font-semibold uppercase tracking-wide text-amber-500">{status?.state}</span>
                                        )}
                                    </div>
                                    <p className="text-xs text-muted-foreground truncate">{s.summary}</p>
                                </div>
                                <div className="flex flex-row items-center gap-1 shrink-0">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={startDisabled}
                                        onClick={() => (isPaused ? resume() : start(s))}
                                        title={missionLive ? "Disabled during a live mission session" : anotherActive ? "Another simulation is running" : isPaused ? "Resume" : "Run"}
                                    >
                                        {busy && !status ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                                    </Button>
                                    <Button variant="outline" size="sm" disabled={busy || !isRunning} onClick={pause} title="Pause">
                                        <Pause className="w-4 h-4" />
                                    </Button>
                                    <Button variant="outline" size="sm" disabled={busy || !isActive} onClick={end} title="End">
                                        <Square className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>

                            {isOpen && (
                                <div className="px-3 pb-4 pt-1 pl-10 flex flex-col gap-4">
                                    <p className="text-sm text-muted-foreground max-w-2xl">{s.description}</p>

                                    <div className="flex flex-col gap-1.5">
                                        <Label className="text-xs uppercase tracking-wide text-muted-foreground">Duration</Label>
                                        <div className="flex flex-row items-center gap-2 flex-wrap">
                                            <div className="flex flex-row items-center gap-1.5">
                                                <Input
                                                    type="number"
                                                    className="w-24 h-8"
                                                    min={SIM_DURATION_MIN}
                                                    max={SIM_DURATION_MAX}
                                                    value={durations[s.id]}
                                                    onChange={(e) => setDuration(s.id, Number(e.target.value))}
                                                    disabled={isActive}
                                                />
                                                <span className="text-xs text-muted-foreground">min ({SIM_DURATION_MIN}–{SIM_DURATION_MAX})</span>
                                            </div>
                                            <div className="flex flex-row items-center gap-1">
                                                {DURATION_PRESETS.map((p) => (
                                                    <button
                                                        key={p.min}
                                                        disabled={isActive}
                                                        onClick={() => setDuration(s.id, p.min)}
                                                        className={cn(
                                                            "rounded border px-2 py-1 text-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
                                                            durations[s.id] === p.min ? "border-blue-500/50 bg-blue-500/15 text-blue-400" : "text-muted-foreground hover:bg-secondary/60"
                                                        )}
                                                    >
                                                        {p.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {s.params.length > 0 && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl">
                                            {s.params.map((p) => (
                                                <div key={p.key} className="flex flex-col gap-1.5">
                                                    <Label htmlFor={`${s.id}-${p.key}`} className="text-xs">
                                                        {p.label}{p.unit ? ` (${p.unit})` : ""}
                                                    </Label>
                                                    {p.type === "select" ? (
                                                        <select
                                                            id={`${s.id}-${p.key}`}
                                                            disabled={isActive}
                                                            value={String(params[s.id][p.key])}
                                                            onChange={(e) => setParam(s.id, p.key, e.target.value)}
                                                            className="h-8 rounded-md border bg-transparent px-2 text-sm cursor-pointer disabled:opacity-50"
                                                        >
                                                            {p.options?.map((o) => (
                                                                <option key={o.value} value={o.value}>{o.label}</option>
                                                            ))}
                                                        </select>
                                                    ) : (
                                                        <Input
                                                            id={`${s.id}-${p.key}`}
                                                            type="number"
                                                            className="h-8"
                                                            min={p.min}
                                                            max={p.max}
                                                            step={p.step}
                                                            disabled={isActive}
                                                            value={params[s.id][p.key]}
                                                            onChange={(e) => setParam(s.id, p.key, Number(e.target.value))}
                                                        />
                                                    )}
                                                    {p.hint && <p className="text-[0.7rem] text-muted-foreground">{p.hint}</p>}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
