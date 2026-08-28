"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useProject } from "@/components/project-context";
import { bStore } from "@/hooks/useAppStore";
import {
    ClaimConflictError,
    deleteQueuedCommand,
    enqueueBlock,
    fetchAutoRelease,
    fetchCommandQueue,
    reorderCommandQueue,
    retryQueuedItem,
    sendQueuedCommand,
    setAutoRelease as persistAutoRelease,
} from "@/lib/command-queue";
import { fetchScalarDictionary } from "@/lib/scalar";
import type {
    DelayBlockConfig,
    QueuedItem,
    ScalarCommandSpec,
    WaitEventBlockConfig,
} from "@/types/scalar";
import {
    ChevronRight,
    Clock,
    Loader2,
    MoreVertical,
    Play,
    Plus,
    Radio,
    RefreshCcw,
    RotateCcw,
    Square,
    Trash2,
    TriangleAlert,
    Waypoints,
} from "lucide-react";

const POLL_MS = 10_000;
const PASS_CHECK_MS = 30_000;

type RowState =
    | { kind: "idle" }
    | { kind: "sending" }
    | { kind: "deleting" }
    | { kind: "error"; message: string };

function timeAgo(iso: string) {
    const ms = Date.now() - new Date(iso).getTime();
    if (ms < 0) return "just now";
    const s = Math.floor(ms / 1000);
    if (s < 60) return `${s}s ago`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    return `${h}h ago`;
}

function BlockIcon({ item }: { item: Extract<QueuedItem, { kind: "block" }> }) {
    return item.blockType === "delay"
        ? <Clock className="w-4 h-4 text-muted-foreground" />
        : <Waypoints className="w-4 h-4 text-muted-foreground" />;
}

function blockSummary(item: Extract<QueuedItem, { kind: "block" }>) {
    if (item.blockType === "delay") {
        const cfg = item.blockConfig as DelayBlockConfig;
        return `Wait ${cfg.seconds}s`;
    }
    const cfg = item.blockConfig as WaitEventBlockConfig;
    return `Wait for event "${cfg.eventName}" (timeout ${cfg.timeoutSec}s)`;
}

export default function CommandQueueView() {
    const { activeProject } = useProject();
    const projectId = activeProject?.id ?? null;

    const [queue, setQueue] = React.useState<QueuedItem[]>([]);
    const [dictionary, setDictionary] = React.useState<Record<string, ScalarCommandSpec>>({});
    const [loading, setLoading] = React.useState(true);
    const [loadError, setLoadError] = React.useState<string | null>(null);
    const [openId, setOpenId] = React.useState<number | null>(null);
    const [rowStates, setRowStates] = React.useState<Record<number, RowState>>({});
    const [confirming, setConfirming] = React.useState<QueuedItem | null>(null);

    const [dragId, setDragId] = React.useState<number | null>(null);
    const [overId, setOverId] = React.useState<number | null>(null);

    const [addingBlock, setAddingBlock] = React.useState<"delay" | "wait_event" | null>(null);
    const [delaySeconds, setDelaySeconds] = React.useState("30");
    const [eventName, setEventName] = React.useState("");
    const [eventTimeout, setEventTimeout] = React.useState("120");
    const [blockError, setBlockError] = React.useState<string | null>(null);

    const runningRef = React.useRef(false);
    const [running, setRunning] = React.useState(false);
    const [runnerPhase, setRunnerPhase] = React.useState<{ itemId: number; label: string } | null>(null);
    const [runnerError, setRunnerError] = React.useState<string | null>(null);

    const [autoRelease, setAutoRelease] = React.useState(false);

    const load = React.useCallback(async () => {
        if (!projectId) return;
        try {
            const rows = await fetchCommandQueue(projectId);
            setQueue(rows);
            setLoadError(null);
        } catch (e) {
            setLoadError(e instanceof Error ? e.message : "Failed to load command queue");
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    React.useEffect(() => {
        setLoading(true);
        load();
        const interval = setInterval(load, POLL_MS);
        return () => clearInterval(interval);
    }, [load]);

    React.useEffect(() => {
        fetchScalarDictionary().then(({ dictionary }) => {
            if (!dictionary) return;
            setDictionary(Object.fromEntries(dictionary.commands.map((c) => [c.name, c])));
        });
    }, []);

    React.useEffect(() => {
        if (!projectId) return;
        fetchAutoRelease(projectId).then(setAutoRelease);
    }, [projectId]);

    const setRowState = (id: number, s: RowState) =>
        setRowStates((prev) => ({ ...prev, [id]: s }));

    const sleep = React.useCallback((ms: number) => new Promise<void>((resolve) => {
        const start = Date.now();
        const tick = () => {
            if (!runningRef.current || Date.now() - start >= ms) { resolve(); return; }
            setTimeout(tick, 250);
        };
        tick();
    }), []);

    const waitForEvent = React.useCallback(async (name: string, timeoutSec: number): Promise<boolean> => {
        const baselineSeq = bStore.getState().scalarEvents.reduce((m, e) => Math.max(m, e.seq), -1);
        const deadline = Date.now() + timeoutSec * 1000;
        while (runningRef.current && Date.now() < deadline) {
            const hit = bStore.getState().scalarEvents.some((e) => e.seq > baselineSeq && e.name === name);
            if (hit) return true;
            await sleep(500);
        }
        return false;
    }, [sleep]);

    const runQueue = React.useCallback(async () => {
        if (!projectId || runningRef.current) return;
        runningRef.current = true;
        setRunning(true);
        setRunnerError(null);

        while (runningRef.current) {
            let items: QueuedItem[];
            try {
                items = await fetchCommandQueue(projectId);
            } catch {
                setRunnerError("Lost contact with the queue - stopped");
                break;
            }
            setQueue(items);
            const head = items[0];
            if (!head) break;

            if (head.kind === "command") {
                setRunnerPhase({ itemId: head.id, label: `Sending ${head.mnemonic}` });
                try {
                    await sendQueuedCommand(head.id);
                } catch (e) {
                    if (e instanceof ClaimConflictError) continue;
                    const message = e instanceof Error ? e.message : "Command failed";
                    setRunnerError(`${head.mnemonic} failed: ${message} - queue stopped`);
                    setRowState(head.id, { kind: "error", message });
                    break;
                }
            } else if (head.blockType === "delay") {
                const cfg = head.blockConfig as DelayBlockConfig;
                setRunnerPhase({ itemId: head.id, label: `Waiting ${cfg.seconds}s` });
                await sleep(cfg.seconds * 1000);
                if (!runningRef.current) break;
                await deleteQueuedCommand(head.id);
            } else {
                const cfg = head.blockConfig as WaitEventBlockConfig;
                setRunnerPhase({ itemId: head.id, label: `Waiting for event "${cfg.eventName}"` });
                const ok = await waitForEvent(cfg.eventName, cfg.timeoutSec);
                if (!runningRef.current) break;
                if (!ok) {
                    setRunnerError(`Timed out waiting for "${cfg.eventName}" - queue stopped, nothing after this block ran`);
                    break;
                }
                await deleteQueuedCommand(head.id);
            }
        }

        runningRef.current = false;
        setRunning(false);
        setRunnerPhase(null);
        load();
    }, [projectId, load, sleep, waitForEvent]);

    const stopRunner = () => { runningRef.current = false; };

    const toggleAutoRelease = (checked: boolean) => {
        setAutoRelease(checked);
        if (projectId) persistAutoRelease(projectId, checked);
    };

    React.useEffect(() => {
        if (!autoRelease || !projectId) return;
        let alive = true;
        const check = async () => {
            if (!alive || runningRef.current) return;
            try {
                const r = await fetch(`/api/projects/${projectId}/calendar`, { cache: "no-store" });
                if (!r.ok) return;
                const events: { kind: string; startsAt: string; durationMin: number }[] = await r.json();
                const now = Date.now();
                const inPass = events.some((e) => {
                    if (e.kind !== "pass") return false;
                    const start = new Date(e.startsAt).getTime();
                    return now >= start && now <= start + e.durationMin * 60_000;
                });
                if (inPass) runQueue();
            } catch {}
        };
        check();
        const interval = setInterval(check, PASS_CHECK_MS);
        return () => { alive = false; clearInterval(interval); };
    }, [autoRelease, projectId, runQueue]);

    const doSend = async (item: QueuedItem) => {
        setRowState(item.id, { kind: "sending" });
        try {
            await sendQueuedCommand(item.id);
            setQueue((prev) => prev.filter((q) => q.id !== item.id));
        } catch (e) {
            if (e instanceof ClaimConflictError) {
                setRowState(item.id, { kind: "idle" });
                load();
                return;
            }
            setRowState(item.id, { kind: "error", message: e instanceof Error ? e.message : "Send failed" });
        }
    };

    const doRetry = async (item: QueuedItem) => {
        setRowState(item.id, { kind: "idle" });
        try {
            await retryQueuedItem(item.id);
            load();
        } catch (e) {
            setRowState(item.id, { kind: "error", message: e instanceof Error ? e.message : "Retry failed" });
        }
    };

    const doDelete = async (item: QueuedItem) => {
        setConfirming(null);
        setRowState(item.id, { kind: "deleting" });
        try {
            await deleteQueuedCommand(item.id);
            setQueue((prev) => prev.filter((q) => q.id !== item.id));
        } catch (e) {
            setRowState(item.id, { kind: "error", message: e instanceof Error ? e.message : "Delete failed" });
        }
    };

    const handleDrop = async (targetId: number) => {
        const from = dragId;
        setDragId(null);
        setOverId(null);
        if (!projectId || from == null || from === targetId) return;

        const ids = queue.map((q) => q.id);
        const fromIdx = ids.indexOf(from);
        const toIdx = ids.indexOf(targetId);
        if (fromIdx === -1 || toIdx === -1) return;
        ids.splice(toIdx, 0, ids.splice(fromIdx, 1)[0]);

        const byId = new Map(queue.map((q) => [q.id, q]));
        setQueue(ids.map((id) => byId.get(id)!));
        await reorderCommandQueue(projectId, ids);
    };

    const submitBlock = async () => {
        if (!projectId || !addingBlock) return;
        setBlockError(null);
        try {
            if (addingBlock === "delay") {
                const seconds = Number(delaySeconds);
                if (!Number.isFinite(seconds) || seconds <= 0) throw new Error("Enter a positive number of seconds");
                await enqueueBlock(projectId, "delay", { seconds });
            } else {
                if (!eventName.trim()) throw new Error("Enter an event name to wait for");
                const timeoutSec = Number(eventTimeout);
                await enqueueBlock(projectId, "wait_event", {
                    eventName: eventName.trim(),
                    timeoutSec: Number.isFinite(timeoutSec) && timeoutSec > 0 ? timeoutSec : 120,
                });
            }
            setAddingBlock(null);
            setDelaySeconds("30");
            setEventName("");
            setEventTimeout("120");
            load();
        } catch (e) {
            setBlockError(e instanceof Error ? e.message : "Failed to insert block");
        }
    };

    if (!activeProject) {
        return <p className="text-sm text-muted-foreground px-1">Select a project to view its command queue.</p>;
    }

    return (
        <div className="flex flex-col gap-4 h-full min-h-0">
            <div className="flex flex-col gap-3">
                <div className="flex flex-row items-center justify-between gap-2 flex-wrap">
                    <p className="text-sm text-muted-foreground">
                        Commands run top to bottom. Nothing here has reached the spacecraft yet - this tab or
                        gs-routing&apos;s own queue runner may both advance it.
                    </p>
                    <div className="flex flex-row items-center gap-2">
                        {running ? (
                            <Button variant="destructive" size="sm" onClick={stopRunner}>
                                <Square className="w-3.5 h-3.5" /> Stop
                            </Button>
                        ) : (
                            <Button variant="outline" size="sm" onClick={runQueue} disabled={queue.length === 0}>
                                <Play className="w-3.5 h-3.5" /> Run queue
                            </Button>
                        )}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setAddingBlock(addingBlock ? null : "delay")}
                            disabled={running}
                        >
                            <Plus className="w-3.5 h-3.5" /> Insert block
                        </Button>
                        <Button variant="outline" size="sm" onClick={load}>
                            <RefreshCcw className="w-3.5 h-3.5" /> Refresh
                        </Button>
                    </div>
                </div>

                <label className="flex flex-row items-center gap-2 text-sm text-muted-foreground cursor-pointer w-fit">
                    <Checkbox checked={autoRelease} onCheckedChange={(c) => toggleAutoRelease(c === true)} />
                    Auto-run this queue during scheduled passes
                </label>
                {autoRelease && (
                    <p className="text-xs text-muted-foreground -mt-2 pl-6">
                        Based on the mission calendar&apos;s &quot;pass&quot; events, not real orbit tracking - accurate only if
                        those entries are. Only runs while this tab stays open.
                    </p>
                )}
            </div>

            {addingBlock && (
                <div className="rounded-lg border bg-secondary/30 p-3 flex flex-col gap-3">
                    <div className="flex flex-row gap-2">
                        <Button
                            size="sm"
                            variant={addingBlock === "delay" ? "default" : "outline"}
                            onClick={() => setAddingBlock("delay")}
                        >
                            <Clock className="w-3.5 h-3.5" /> Delay
                        </Button>
                        <Button
                            size="sm"
                            variant={addingBlock === "wait_event" ? "default" : "outline"}
                            onClick={() => setAddingBlock("wait_event")}
                        >
                            <Waypoints className="w-3.5 h-3.5" /> Wait for event
                        </Button>
                    </div>

                    {addingBlock === "delay" ? (
                        <div className="flex flex-row items-end gap-2">
                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="delay-seconds" className="text-xs">Seconds to wait</Label>
                                <Input
                                    id="delay-seconds"
                                    className="h-8 w-32 font-mono"
                                    value={delaySeconds}
                                    onChange={(e) => setDelaySeconds(e.target.value)}
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3">
                            <p className="text-xs text-muted-foreground max-w-md">
                                Pauses the runner until this event name appears on scalar:events, or the timeout
                                elapses. This confirms an EVR fired - not that the command it corresponds to
                                succeeded, since nothing here ties a command to its result directly. Pick an event
                                that only fires on completion of the command before it.
                            </p>
                            <div className="flex flex-row items-end gap-2 flex-wrap">
                                <div className="flex flex-col gap-1.5">
                                    <Label htmlFor="event-name" className="text-xs">Event name</Label>
                                    <Input
                                        id="event-name"
                                        className="h-8 w-56 font-mono"
                                        placeholder="e.g. CDH_BootComplete"
                                        value={eventName}
                                        onChange={(e) => setEventName(e.target.value)}
                                    />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <Label htmlFor="event-timeout" className="text-xs">Timeout (s)</Label>
                                    <Input
                                        id="event-timeout"
                                        className="h-8 w-24 font-mono"
                                        value={eventTimeout}
                                        onChange={(e) => setEventTimeout(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {blockError && <p className="text-xs text-red-400">{blockError}</p>}

                    <div className="flex flex-row justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setAddingBlock(null)}>Cancel</Button>
                        <Button size="sm" onClick={submitBlock}>Add to queue</Button>
                    </div>
                </div>
            )}

            {loadError && (
                <div className="rounded-lg border border-red-500/50 bg-red-950/30 px-4 py-2.5 text-sm text-red-400">
                    {loadError}
                </div>
            )}
            {runnerError && (
                <div className="rounded-lg border border-red-500/50 bg-red-950/30 px-4 py-2.5 text-sm text-red-400 flex flex-row items-start gap-2">
                    <TriangleAlert className="w-4 h-4 shrink-0 mt-0.5" /> {runnerError}
                </div>
            )}

            <div className="rounded-md border divide-y overflow-y-auto min-h-0">
                {loading && (
                    <p className="text-sm text-muted-foreground px-3 py-4 flex flex-row items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Loading queue...
                    </p>
                )}
                {!loading && queue.length === 0 && (
                    <p className="text-sm text-muted-foreground px-3 py-4">No commands queued for send.</p>
                )}
                {queue.map((item, i) => {
                    const isOpen = openId === item.id;
                    const state = rowStates[item.id] ?? { kind: "idle" };
                    const busy = state.kind === "sending" || state.kind === "deleting";
                    const isCurrent = runnerPhase?.itemId === item.id;
                    const spec = item.kind === "command" ? dictionary[item.mnemonic] : undefined;

                    return (
                        <div
                            key={item.id}
                            draggable={!running}
                            onDragStart={() => setDragId(item.id)}
                            onDragOver={(e) => { e.preventDefault(); if (overId !== item.id) setOverId(item.id); }}
                            onDrop={() => handleDrop(item.id)}
                            onDragEnd={() => { setDragId(null); setOverId(null); }}
                            className={`${dragId === item.id ? "opacity-40" : ""} ${overId === item.id && dragId !== null && dragId !== item.id ? "border-t-2 border-blue-500" : ""} ${isCurrent ? "bg-blue-500/5" : ""}`}
                        >
                            <div className="flex flex-row items-center gap-2 px-3 py-2.5">
                                <span
                                    className={`shrink-0 ${running ? "text-muted-foreground/30" : "text-muted-foreground/60 hover:text-foreground cursor-grab active:cursor-grabbing"}`}
                                    title={running ? "Stop the runner to reorder" : "Drag to reorder"}
                                >
                                    <MoreVertical className="w-4 h-4" />
                                </span>
                                <button
                                    onClick={() => setOpenId(isOpen ? null : item.id)}
                                    className="p-1 -m-1 rounded text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
                                    aria-label={isOpen ? "Collapse" : "Expand"}
                                >
                                    <ChevronRight className={`w-4 h-4 transition-transform ${isOpen ? "rotate-90" : ""}`} />
                                </button>
                                <span className="text-xs font-mono text-muted-foreground shrink-0 w-6 text-right">
                                    #{i + 1}
                                </span>

                                {item.kind === "block" && <BlockIcon item={item} />}

                                <div className="min-w-0 flex-1">
                                    {item.kind === "command" ? (
                                        <>
                                            <div className="flex flex-row items-baseline gap-2">
                                                <h3 className="font-mono font-medium truncate">{item.mnemonic}</h3>
                                                {item.args.length > 0 && (
                                                    <span className="text-[0.65rem] text-muted-foreground shrink-0">
                                                        {item.args.length} arg{item.args.length === 1 ? "" : "s"}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-muted-foreground truncate">
                                                {isCurrent && running ? runnerPhase!.label : `Queued by ${item.queuedByName ?? item.queuedBy} · ${timeAgo(item.createdAt)}`}
                                            </p>
                                        </>
                                    ) : (
                                        <>
                                            <h3 className="font-medium truncate">{blockSummary(item)}</h3>
                                            <p className="text-xs text-muted-foreground truncate">
                                                {isCurrent && running ? runnerPhase!.label : `Inserted by ${item.queuedByName ?? item.queuedBy} · ${timeAgo(item.createdAt)}`}
                                            </p>
                                        </>
                                    )}
                                </div>

                                {isCurrent && running && <Loader2 className="w-4 h-4 animate-spin text-blue-400 shrink-0" />}

                                {item.status === "sending" && !isCurrent ? (
                                    <span className="text-xs text-muted-foreground shrink-0 flex flex-row items-center gap-1.5 px-2">
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Claimed
                                    </span>
                                ) : item.status === "error" ? (
                                    <>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="shrink-0"
                                            disabled={busy || running}
                                            onClick={() => doRetry(item)}
                                            title="Clear the error and requeue"
                                        >
                                            <RotateCcw className="w-4 h-4" /> Retry
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="shrink-0 text-red-500 hover:text-red-500"
                                            disabled={busy || running}
                                            onClick={() => setConfirming(item)}
                                            title="Remove from queue"
                                        >
                                            {state.kind === "deleting" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                        </Button>
                                    </>
                                ) : (
                                    <>
                                        {item.kind === "command" && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="shrink-0"
                                                disabled={busy || running}
                                                onClick={() => doSend(item)}
                                                title="Send now"
                                            >
                                                {state.kind === "sending" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Radio className="w-4 h-4" />}
                                            </Button>
                                        )}
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="shrink-0 text-red-500 hover:text-red-500"
                                            disabled={busy || running}
                                            onClick={() => setConfirming(item)}
                                            title="Remove from queue"
                                        >
                                            {state.kind === "deleting" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                        </Button>
                                    </>
                                )}
                            </div>

                            {item.status === "error" && item.error && (
                                <div className="mx-3 mb-2.5 rounded-md border border-red-500/50 bg-red-950/30 px-3 py-2 text-xs text-red-400">
                                    {item.error} - the queue won&apos;t advance past this until it&apos;s retried or removed.
                                </div>
                            )}
                            {state.kind === "error" && (
                                <div className="mx-3 mb-2.5 rounded-md border border-red-500/50 bg-red-950/30 px-3 py-2 text-xs text-red-400">
                                    {state.message}
                                </div>
                            )}

                            {isOpen && (
                                <div className="px-3 pb-4 pt-1 pl-16 flex flex-col gap-2">
                                    <p className="text-xs text-muted-foreground">
                                        {item.kind === "command" ? "Queued" : "Inserted"} at {new Date(item.createdAt).toLocaleString()}
                                    </p>
                                    {item.kind === "command" ? (
                                        item.args.length === 0 ? (
                                            <p className="text-xs text-muted-foreground">This command takes no arguments.</p>
                                        ) : (
                                            <div className="rounded-md border bg-secondary/40 p-2.5 font-mono text-xs flex flex-col gap-1 max-w-md">
                                                {item.args.map((v, idx) => (
                                                    <div key={idx} className="flex flex-row gap-2">
                                                        <span className="text-muted-foreground shrink-0">
                                                            {spec?.args[idx]?.name ?? `arg${idx}`}
                                                        </span>
                                                        <span className="truncate">{v || "∅"}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )
                                    ) : (
                                        <div className="rounded-md border bg-secondary/40 p-2.5 font-mono text-xs flex flex-col gap-1 max-w-md">
                                            {item.blockType === "delay" ? (
                                                <div className="flex flex-row gap-2">
                                                    <span className="text-muted-foreground shrink-0">seconds</span>
                                                    <span>{(item.blockConfig as DelayBlockConfig).seconds}</span>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="flex flex-row gap-2">
                                                        <span className="text-muted-foreground shrink-0">eventName</span>
                                                        <span>{(item.blockConfig as WaitEventBlockConfig).eventName}</span>
                                                    </div>
                                                    <div className="flex flex-row gap-2">
                                                        <span className="text-muted-foreground shrink-0">timeoutSec</span>
                                                        <span>{(item.blockConfig as WaitEventBlockConfig).timeoutSec}</span>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {confirming && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60" onClick={() => setConfirming(null)} />
                    <div className="relative z-10 w-full max-w-md rounded-lg border bg-background shadow-2xl p-5 flex flex-col gap-4">
                        <div className="flex flex-row items-start gap-2">
                            <TriangleAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                            <div>
                                <h3 className="font-semibold">
                                    Remove this {confirming.kind === "command" ? "command" : "block"} from the queue?
                                </h3>
                                <p className="text-sm text-muted-foreground pt-1">
                                    {confirming.kind === "command"
                                        ? "It will not be sent to the spacecraft."
                                        : "Anything queued after it will run without waiting on it."} This cannot be undone.
                                </p>
                            </div>
                        </div>
                        <div className="rounded-md border bg-secondary/40 p-3 font-mono text-sm break-all">
                            {confirming.kind === "command" ? (
                                <>
                                    {confirming.mnemonic}
                                    {confirming.args.length > 0 && (
                                        <span className="text-muted-foreground"> {confirming.args.map((a) => a || "∅").join(" ")}</span>
                                    )}
                                </>
                            ) : (
                                blockSummary(confirming)
                            )}
                        </div>
                        <div className="flex flex-row justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => setConfirming(null)}>Cancel</Button>
                            <Button variant="destructive" size="sm" onClick={() => doDelete(confirming)}>
                                Remove
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
