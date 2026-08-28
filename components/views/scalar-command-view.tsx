"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useProject } from "@/components/project-context";
import { useSettings } from "@/lib/settings";
import { bStore } from "@/hooks/useAppStore";
import { fetchScalarDictionary, sendScalarCommand, type ScalarBridgeState } from "@/lib/scalar";
import { enqueueCommand } from "@/lib/command-queue";
import type { ScalarCommandSpec } from "@/types/scalar";
import { ChevronRight, Clock, Loader2, Radio, Search, TriangleAlert } from "lucide-react";

type SendState =
    | { kind: "idle" }
    | { kind: "sending" }
    | { kind: "sent"; mnemonic: string }
    | { kind: "queued"; mnemonic: string }
    | { kind: "error"; message: string };

function argPlaceholder(type: string) {
    const t = type.toLowerCase();
    if (t.includes("bool")) return "true / false";
    if (t.includes("f32") || t.includes("f64") || t.includes("float")) return "0.0";
    if (t.includes("i") || t.includes("u")) return "0";
    if (t.includes("string")) return "text";
    return type;
}

export default function ScalarCommandView() {
    const { activeProject } = useProject();
    const [settings] = useSettings();
    const simStatus = bStore.use.simStatus();

    const [bridge, setBridge] = React.useState<ScalarBridgeState>("loading");
    const [commands, setCommands] = React.useState<ScalarCommandSpec[]>([]);
    const [search, setSearch] = React.useState("");
    const [openMnemonic, setOpenMnemonic] = React.useState<string | null>(null);
    const [args, setArgs] = React.useState<Record<string, Record<string, string>>>({});
    const [send, setSend] = React.useState<SendState>({ kind: "idle" });
    const [confirming, setConfirming] = React.useState<ScalarCommandSpec | null>(null);
    const [focused, setFocused] = React.useState(false);
    const [highlightIndex, setHighlightIndex] = React.useState(0);
    const rowRefs = React.useRef<Record<string, HTMLDivElement | null>>({});

    const simActive = !!simStatus?.active;

    const load = React.useCallback(async () => {
        setBridge("loading");
        const { dictionary, state } = await fetchScalarDictionary();
        setBridge(state);
        setCommands(dictionary?.commands ?? []);
    }, []);

    React.useEffect(() => { load(); }, [load]);

    const setArg = (mnemonic: string, name: string, value: string) =>
        setArgs((prev) => ({ ...prev, [mnemonic]: { ...prev[mnemonic], [name]: value } }));

    const argsFor = (cmd: ScalarCommandSpec) =>
        cmd.args.map((a) => args[cmd.name]?.[a.name] ?? "");

    const doSend = async (cmd: ScalarCommandSpec) => {
        setConfirming(null);
        setSend({ kind: "sending" });
        try {
            await sendScalarCommand(cmd.name, argsFor(cmd));
            setSend({ kind: "sent", mnemonic: cmd.name });
        } catch (e) {
            setSend({ kind: "error", message: e instanceof Error ? e.message : "Command failed" });
        }
    };

    const onSend = (cmd: ScalarCommandSpec) => {
        if (settings.confirmCommands) {
            setConfirming(cmd);
            return;
        }
        doSend(cmd);
    };

    const onQueue = async (cmd: ScalarCommandSpec) => {
        if (!activeProject) return;
        setSend({ kind: "sending" });
        try {
            await enqueueCommand(activeProject.id, cmd.name, argsFor(cmd));
            setSend({ kind: "queued", mnemonic: cmd.name });
        } catch (e) {
            setSend({ kind: "error", message: e instanceof Error ? e.message : "Failed to queue command" });
        }
    };

    const searchLow = search.trim().toLowerCase();
    const filtered = searchLow
        ? commands.filter(
            (c) =>
                c.name.toLowerCase().includes(searchLow) ||
                (c.description ?? "").toLowerCase().includes(searchLow)
        )
        : commands;
    const suggestions = searchLow ? filtered.slice(0, 8) : [];

    React.useEffect(() => {
        setHighlightIndex(0);
    }, [searchLow]);

    const selectSuggestion = (cmd: ScalarCommandSpec) => {
        setOpenMnemonic(cmd.name);
        setFocused(false);
        requestAnimationFrame(() => {
            rowRefs.current[cmd.name]?.scrollIntoView({ block: "nearest" });
        });
    };

    const onSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (suggestions.length === 0) return;
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlightIndex((i) => Math.min(i + 1, suggestions.length - 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlightIndex((i) => Math.max(i - 1, 0));
        } else if (e.key === "Enter") {
            e.preventDefault();
            const cmd = suggestions[highlightIndex];
            if (cmd) selectSuggestion(cmd);
        } else if (e.key === "Escape") {
            setFocused(false);
        }
    };

    return (
        <div className="flex flex-col gap-4 h-full min-h-0">
            {simActive && (
                <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-2.5 flex flex-row items-center gap-2 text-amber-500">
                    <TriangleAlert className="w-4 h-4 shrink-0" />
                    <p className="text-sm">
                        A simulation is running. Commands still go to the real GDS link — the simulator does not consume them.
                    </p>
                </div>
            )}

            {bridge !== "ok" && bridge !== "loading" && (
                <div className="rounded-lg border px-4 py-2.5 flex flex-row items-center justify-between gap-3 text-muted-foreground">
                    <div className="flex flex-row items-center gap-2 min-w-0">
                        <TriangleAlert className="w-4 h-4 shrink-0" />
                        <p className="text-sm">
                            {bridge === "unconfigured"
                                ? "GDS bridge not configured. Set GDS_BRIDGE_URL to point at the running gds-bridge."
                                : "GDS bridge unreachable. Check that gds-bridge is running and connected to the F' GDS TCP server."}
                        </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={load}>Retry</Button>
                </div>
            )}

            {send.kind === "sent" && (
                <div className="rounded-lg border border-green-600/50 bg-green-600/10 px-4 py-2.5 text-sm text-green-500">
                    Sent <span className="font-mono">{send.mnemonic}</span> to the spacecraft.
                </div>
            )}
            {send.kind === "queued" && (
                <div className="rounded-lg border border-blue-500/50 bg-blue-500/10 px-4 py-2.5 text-sm text-blue-400">
                    Queued <span className="font-mono">{send.mnemonic}</span> - see the Queue view to release or remove it.
                </div>
            )}
            {send.kind === "error" && (
                <div className="rounded-lg border border-red-500/50 bg-red-950/30 px-4 py-2.5 text-sm text-red-400">
                    {send.message}
                </div>
            )}

            <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                    className="pl-9"
                    placeholder={bridge === "ok" ? `Type a mnemonic... (${commands.length} commands)` : "Filter commands..."}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    onKeyDown={onSearchKeyDown}
                    disabled={bridge !== "ok"}
                    role="combobox"
                    aria-autocomplete="list"
                    aria-expanded={focused && suggestions.length > 0}
                    aria-controls="scalar-command-suggestions"
                />
                {focused && suggestions.length > 0 && (
                    <div
                        id="scalar-command-suggestions"
                        role="listbox"
                        className="absolute z-20 top-full left-0 right-0 mt-1 rounded-md border bg-background shadow-lg overflow-hidden"
                    >
                        {suggestions.map((cmd, i) => (
                            <button
                                key={cmd.name}
                                type="button"
                                role="option"
                                aria-selected={i === highlightIndex}
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => selectSuggestion(cmd)}
                                onMouseEnter={() => setHighlightIndex(i)}
                                className={cn(
                                    "w-full text-left px-3 py-2 flex flex-row items-baseline gap-2 cursor-pointer",
                                    i === highlightIndex ? "bg-secondary" : "hover:bg-secondary/50"
                                )}
                            >
                                <span className="font-mono text-sm font-medium shrink-0">{cmd.name}</span>
                                {cmd.description && (
                                    <span className="text-xs text-muted-foreground truncate">{cmd.description}</span>
                                )}
                            </button>
                        ))}
                        {filtered.length > suggestions.length && (
                            <div className="px-3 py-1.5 text-[0.7rem] text-muted-foreground border-t">
                                +{filtered.length - suggestions.length} more below
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="rounded-md border divide-y overflow-y-auto min-h-0">
                {bridge === "loading" && (
                    <p className="text-sm text-muted-foreground px-3 py-4 flex flex-row items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Loading command dictionary...
                    </p>
                )}
                {bridge === "ok" && filtered.length === 0 && (
                    <p className="text-sm text-muted-foreground px-3 py-4">
                        {commands.length === 0 ? "The dictionary contains no commands." : "No commands match that filter."}
                    </p>
                )}
                {filtered.map((cmd) => {
                    const isOpen = openMnemonic === cmd.name;
                    return (
                        <div key={cmd.name} ref={(el) => { rowRefs.current[cmd.name] = el; }}>
                            <div className="flex flex-row items-center gap-3 px-3 py-2.5">
                                <button
                                    onClick={() => setOpenMnemonic(isOpen ? null : cmd.name)}
                                    className="p-1 -m-1 rounded text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
                                    aria-label={isOpen ? "Collapse" : "Expand"}
                                >
                                    <ChevronRight className={cn("w-4 h-4 transition-transform", isOpen && "rotate-90")} />
                                </button>
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-row items-baseline gap-2">
                                        <h3 className="font-mono font-medium truncate">{cmd.name}</h3>
                                        <span className="text-[0.65rem] text-muted-foreground shrink-0">
                                            op {cmd.opcode}
                                            {cmd.args.length > 0 && ` · ${cmd.args.length} arg${cmd.args.length === 1 ? "" : "s"}`}
                                        </span>
                                    </div>
                                    {cmd.description && (
                                        <p className="text-xs text-muted-foreground truncate">{cmd.description}</p>
                                    )}
                                </div>
                                {cmd.args.length === 0 && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="shrink-0"
                                        disabled={send.kind === "sending"}
                                        onClick={() => onQueue(cmd)}
                                        title="Add to queue instead of sending now"
                                    >
                                        <Clock className="w-4 h-4" />
                                    </Button>
                                )}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="shrink-0"
                                    disabled={send.kind === "sending"}
                                    onClick={() => (cmd.args.length > 0 && !isOpen ? setOpenMnemonic(cmd.name) : onSend(cmd))}
                                    title={cmd.args.length > 0 && !isOpen ? "Fill in arguments" : "Send"}
                                >
                                    {send.kind === "sending" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Radio className="w-4 h-4" />}
                                </Button>
                            </div>

                            {isOpen && (
                                <div className="px-3 pb-4 pt-1 pl-10 flex flex-col gap-3">
                                    {cmd.description && (
                                        <p className="text-sm text-muted-foreground max-w-2xl">{cmd.description}</p>
                                    )}
                                    {cmd.args.length > 0 ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl">
                                            {cmd.args.map((a) => (
                                                <div key={a.name} className="flex flex-col gap-1.5">
                                                    <Label htmlFor={`${cmd.name}-${a.name}`} className="text-xs">
                                                        {a.name} <span className="text-muted-foreground font-mono">({a.type})</span>
                                                    </Label>
                                                    {a.type.toLowerCase().includes("bool") ? (
                                                        <div className="flex flex-row gap-1.5">
                                                            {["true", "false"].map((v) => (
                                                                <button
                                                                    key={v}
                                                                    type="button"
                                                                    onClick={() => setArg(cmd.name, a.name, v)}
                                                                    className={cn(
                                                                        "h-8 px-3 rounded-md border text-sm font-mono cursor-pointer",
                                                                        (args[cmd.name]?.[a.name] ?? "") === v
                                                                            ? "bg-primary text-primary-foreground border-primary"
                                                                            : "bg-background hover:bg-secondary"
                                                                    )}
                                                                >
                                                                    {v}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <Input
                                                            id={`${cmd.name}-${a.name}`}
                                                            className="h-8 font-mono"
                                                            placeholder={argPlaceholder(a.type)}
                                                            value={args[cmd.name]?.[a.name] ?? ""}
                                                            onChange={(e) => setArg(cmd.name, a.name, e.target.value)}
                                                        />
                                                    )}
                                                    {a.description && (
                                                        <p className="text-[0.7rem] text-muted-foreground">{a.description}</p>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-muted-foreground">This command takes no arguments.</p>
                                    )}
                                    <div className="flex flex-row gap-2">
                                        <Button size="sm" disabled={send.kind === "sending"} onClick={() => onSend(cmd)}>
                                            <Radio className="w-4 h-4" /> Send {cmd.name}
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={send.kind === "sending"}
                                            onClick={() => onQueue(cmd)}
                                        >
                                            <Clock className="w-4 h-4" /> Queue for later
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {confirming && (
                <div className="absolute inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60" onClick={() => setConfirming(null)} />
                    <div className="relative z-10 w-full max-w-md rounded-lg border bg-background shadow-2xl p-5 flex flex-col gap-4">
                        <div>
                            <h3 className="font-semibold">Send command to {activeProject?.name ?? "the spacecraft"}?</h3>
                            <p className="text-sm text-muted-foreground pt-1">
                                This uplinks immediately over the F&apos; GDS link and cannot be recalled.
                            </p>
                        </div>
                        <div className="rounded-md border bg-secondary/40 p-3 font-mono text-sm break-all">
                            {confirming.name}
                            {argsFor(confirming).length > 0 && (
                                <span className="text-muted-foreground"> {argsFor(confirming).map((a) => a || "∅").join(" ")}</span>
                            )}
                        </div>
                        <div className="flex flex-row justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => setConfirming(null)}>Cancel</Button>
                            <Button size="sm" onClick={() => doSend(confirming)}>Confirm uplink</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
