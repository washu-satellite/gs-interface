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
import type { ScalarCommandSpec } from "@/types/scalar";
import { ChevronRight, Loader2, Radio, Search, TriangleAlert } from "lucide-react";

type SendState =
    | { kind: "idle" }
    | { kind: "sending" }
    | { kind: "sent"; mnemonic: string }
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

    const searchLow = search.trim().toLowerCase();
    const filtered = searchLow
        ? commands.filter(
            (c) =>
                c.name.toLowerCase().includes(searchLow) ||
                (c.description ?? "").toLowerCase().includes(searchLow)
        )
        : commands;

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
            {send.kind === "error" && (
                <div className="rounded-lg border border-red-500/50 bg-red-950/30 px-4 py-2.5 text-sm text-red-400">
                    {send.message}
                </div>
            )}

            <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                    className="pl-9"
                    placeholder={bridge === "ok" ? `Filter ${commands.length} commands...` : "Filter commands..."}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    disabled={bridge !== "ok"}
                />
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
                        <div key={cmd.name}>
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
                                                    <Input
                                                        id={`${cmd.name}-${a.name}`}
                                                        className="h-8 font-mono"
                                                        placeholder={argPlaceholder(a.type)}
                                                        value={args[cmd.name]?.[a.name] ?? ""}
                                                        onChange={(e) => setArg(cmd.name, a.name, e.target.value)}
                                                    />
                                                    {a.description && (
                                                        <p className="text-[0.7rem] text-muted-foreground">{a.description}</p>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-muted-foreground">This command takes no arguments.</p>
                                    )}
                                    <div>
                                        <Button size="sm" disabled={send.kind === "sending"} onClick={() => onSend(cmd)}>
                                            <Radio className="w-4 h-4" /> Send {cmd.name}
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
