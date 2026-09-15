"use client";

import { useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    BLOCKS_BY_ID,
    CATEGORY_META,
    CATEGORY_ORDER,
    DashboardView,
    DisplayType,
    DISPLAY_TYPES,
    gaugePct,
    gaugeRange,
    METRIC_BLOCKS,
    MetricBlock,
    numericValue,
    seededSeries,
    ViewItem,
} from "@/lib/blocks";
import { ResponsiveLine } from "@nivo/line";
import { Gauge, Hash, LayoutGrid, LineChart, Plus, Trash2, X } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ViewIcon, VIEW_ICON_KEYS } from "@/lib/view-icons";

const GRID = 16;
const MIN_W = 176;
const MIN_H = 104;
const DEFAULT_W = 224;
const DEFAULT_H = 148;
const snap = (v: number) => Math.round(v / GRID) * GRID;

const DISPLAY_ICON: Record<DisplayType, React.ReactNode> = {
    numeric: <Hash className="w-3.5 h-3.5" />,
    timeseries: <LineChart className="w-3.5 h-3.5" />,
    gauge: <Gauge className="w-3.5 h-3.5" />,
};

function Dial({ block, hex }: { block: MetricBlock; hex: string }) {
    const pct = gaugePct(block);
    const [min, max] = gaugeRange(block);
    const hasValue = Number.isFinite(numericValue(block));

    const cx = 60, cy = 60, R = 46;
    const len = Math.PI * R;
    // Angle for the needle: pct 0 → 180° (left), pct 1 → 0° (right).
    const ang = Math.PI - pct * Math.PI;
    const nx = cx + (R - 12) * Math.cos(ang);
    const ny = cy - (R - 12) * Math.sin(ang);

    const ticks = Array.from({ length: 9 }, (_, i) => {
        const a = Math.PI - (i / 8) * Math.PI;
        const inner = R - 9, outer = R - 3;
        return {
            x1: cx + inner * Math.cos(a), y1: cy - inner * Math.sin(a),
            x2: cx + outer * Math.cos(a), y2: cy - outer * Math.sin(a),
        };
    });

    const fmt = (n: number) => (Math.abs(n) < 10 ? n.toFixed(1) : Math.round(n).toString());

    return (
        <svg viewBox="0 0 120 84" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
            <path d={`M${cx - R} ${cy} A${R} ${R} 0 0 1 ${cx + R} ${cy}`} fill="none" stroke="rgba(148,163,184,0.22)" strokeWidth={7} strokeLinecap="round" />
            <path
                d={`M${cx - R} ${cy} A${R} ${R} 0 0 1 ${cx + R} ${cy}`}
                fill="none" stroke={hex} strokeWidth={7} strokeLinecap="round"
                strokeDasharray={`${pct * len} ${len}`}
            />
            {ticks.map((t, i) => (
                <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke="rgba(148,163,184,0.45)" strokeWidth={1} />
            ))}
            {hasValue && (
                <>
                    <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="text-foreground" />
                    <circle cx={cx} cy={cy} r={3.5} fill={hex} />
                </>
            )}
            <text x={cx - R} y={cy + 11} fontSize={7} fill="rgba(148,163,184,0.8)" textAnchor="start">{fmt(min)}</text>
            <text x={cx + R} y={cy + 11} fontSize={7} fill="rgba(148,163,184,0.8)" textAnchor="end">{fmt(max)}</text>
            <text x={cx} y={cy + 20} fontSize={16} fontWeight={600} fill="currentColor" textAnchor="middle" className="text-foreground">
                {block.value}
                {block.unit && <tspan fontSize={9} dx={2} fill="rgba(148,163,184,0.9)">{block.unit}</tspan>}
            </text>
        </svg>
    );
}

function TileBody({ item, block, live }: { item: ViewItem; block: MetricBlock; live: boolean }) {
    const meta = CATEGORY_META[block.category];

    const header = (
        <div className="flex flex-row items-center gap-1.5 shrink-0">
            <span className={cn("w-2 h-2 rounded-full", meta.dot)} />
            <p className="text-[0.7rem] uppercase tracking-wide text-muted-foreground truncate">{block.label}</p>
        </div>
    );

    if (!live) {
        return (
            <div className="flex flex-col h-full p-3 gap-1">
                {header}
                <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground/60">--</div>
            </div>
        );
    }

    if (item.display === "timeseries") {
        const series = seededSeries(item, block);
        const data = [{ id: block.label, data: series, color: meta.hex }];
        const current = series[series.length - 1]?.y;
        const fmtTick = (v: number) => (Math.abs(v) < 10 ? v.toFixed(1) : Math.round(v).toString());
        return (
            <div className="flex flex-col h-full p-3 gap-1">
                <div className="flex flex-row items-center justify-between gap-2">
                    {header}
                    <p className="text-sm font-semibold shrink-0" style={{ color: meta.hex }}>
                        {current?.toFixed(2)}
                        {block.unit && <span className="text-[0.65rem] pl-0.5 text-muted-foreground">{block.unit}</span>}
                    </p>
                </div>
                <div className="flex-1 min-h-0 -mb-1">
                    <ResponsiveLine
                        data={data}
                        margin={{ top: 6, right: 8, bottom: 4, left: 26 }}
                        yScale={{ type: "linear", min: "auto", max: "auto" }}
                        axisLeft={{ tickSize: 0, tickPadding: 4, tickValues: 3, format: fmtTick }}
                        axisBottom={null}
                        enableGridX={false}
                        enableGridY
                        gridYValues={3}
                        colors={[meta.hex]}
                        lineWidth={2}
                        enableArea
                        areaOpacity={0.1}
                        enablePoints={false}
                        curve="monotoneX"
                        animate={false}
                        isInteractive={false}
                        theme={{
                            axis: { ticks: { text: { fill: "rgba(148,163,184,0.75)", fontSize: 9 } } },
                            grid: { line: { stroke: "rgba(148,163,184,0.16)", strokeDasharray: "3 3" } },
                        }}
                    />
                </div>
            </div>
        );
    }

    if (item.display === "gauge") {
        return (
            <div className="flex flex-col h-full p-3 gap-1">
                {header}
                <div className="flex-1 min-h-0">
                    <Dial block={block} hex={meta.hex} />
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full p-3 gap-1 justify-between">
            {header}
            <p className="font-semibold text-2xl">
                {block.value}
                {block.unit && <span className="text-base pl-1 text-muted-foreground">{block.unit}</span>}
            </p>
        </div>
    );
}

export function CustomDashboardView({ view, live, onDelete }: { view: DashboardView; live: boolean; onDelete: () => void }) {
    const items = (view.blocks ?? []).filter((it) => BLOCKS_BY_ID[it.blockId]);
    const canvasH = items.reduce((m, it) => Math.max(m, it.y + it.h), 0) + 32;

    return (
        <div className="h-full flex flex-col">
            <div className="sticky top-0 z-10 bg-background/60 backdrop-blur-sm flex flex-row items-center justify-between px-4 py-2 border-b">
                <div className="flex flex-row items-center gap-2">
                    <LayoutGrid className="w-4 h-4" />
                    <h2 className="font-semibold text-base">{view.name}</h2>
                    <span className="text-xs text-muted-foreground">{items.length} blocks</span>
                </div>
                <Button variant="ghost" size="sm" onClick={onDelete}>
                    <Trash2 className="w-4 h-4" />
                </Button>
            </div>
            <div className="flex-1 p-4 overflow-auto">
                <div className="relative w-full" style={{ minHeight: Math.max(canvasH, 200) }}>
                    {items.map((it) => {
                        const block = BLOCKS_BY_ID[it.blockId];
                        const meta = CATEGORY_META[block.category];
                        return (
                            <div
                                key={it.i}
                                className={cn("absolute rounded-lg border", meta.tile)}
                                style={{ left: it.x, top: it.y, width: it.w, height: it.h }}
                            >
                                <TileBody item={it} block={block} live={live} />
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

function EditorItem(props: {
    item: ViewItem;
    onChange: (patch: Partial<ViewItem>) => void;
    onRemove: () => void;
}) {
    const { item } = props;
    const block = BLOCKS_BY_ID[item.blockId];
    const meta = CATEGORY_META[block.category];

    const startDrag = (e: React.PointerEvent) => {
        e.preventDefault();
        const sx = e.clientX, sy = e.clientY, ox = item.x, oy = item.y;
        const move = (ev: PointerEvent) =>
            props.onChange({ x: Math.max(0, snap(ox + ev.clientX - sx)), y: Math.max(0, snap(oy + ev.clientY - sy)) });
        const up = () => {
            window.removeEventListener("pointermove", move);
            window.removeEventListener("pointerup", up);
        };
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", up);
    };

    const startResize = (e: React.PointerEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const sx = e.clientX, sy = e.clientY, ow = item.w, oh = item.h;
        const move = (ev: PointerEvent) =>
            props.onChange({ w: Math.max(MIN_W, snap(ow + ev.clientX - sx)), h: Math.max(MIN_H, snap(oh + ev.clientY - sy)) });
        const up = () => {
            window.removeEventListener("pointermove", move);
            window.removeEventListener("pointerup", up);
        };
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", up);
    };

    return (
        <div
            className={cn("absolute rounded-lg border shadow-sm select-none", meta.tile)}
            style={{ left: item.x, top: item.y, width: item.w, height: item.h }}
        >
            <div
                onPointerDown={startDrag}
                className="flex flex-row items-center justify-between gap-1 px-2 py-1 border-b border-border/50 cursor-move"
            >
                <div className="flex flex-row items-center gap-1.5 min-w-0">
                    <span className={cn("w-2 h-2 rounded-full shrink-0", meta.dot)} />
                    <p className="text-[0.7rem] font-medium truncate">{block.label}</p>
                </div>
                <div className="flex flex-row items-center gap-1 shrink-0" onPointerDown={(e) => e.stopPropagation()}>
                    <span className="text-muted-foreground">{DISPLAY_ICON[item.display]}</span>
                    <select
                        value={item.display}
                        onChange={(e) => props.onChange({ display: e.target.value as DisplayType })}
                        className="appearance-none bg-secondary/60 border border-border rounded px-1.5 py-0.5 text-[0.7rem] text-foreground cursor-pointer hover:bg-secondary focus:outline-none"
                    >
                        {DISPLAY_TYPES.map((d) => (
                            <option key={d.value} value={d.value}>{d.label}</option>
                        ))}
                    </select>
                    <button onClick={props.onRemove} className="p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer">
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>
            <div className="h-[calc(100%-1.85rem)]">
                <TileBody item={item} block={block} live />
            </div>
            <div
                onPointerDown={startResize}
                className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize"
                style={{ background: "linear-gradient(135deg, transparent 50%, var(--border) 50%)" }}
            />
        </div>
    );
}

export function MopsEditor(props: { onCancel: () => void; onCreate: (name: string, blocks: ViewItem[], icon: string) => void }) {
    const [name, setName] = useState("");
    const [icon, setIcon] = useState("grid");
    const [items, setItems] = useState<ViewItem[]>([]);
    const counter = useRef(0);

    const byCategory = useMemo(() => {
        const map: Record<string, MetricBlock[]> = {};
        for (const b of METRIC_BLOCKS) (map[b.category] ??= []).push(b);
        return map;
    }, []);

    const addBlock = (b: MetricBlock) => {
        const n = counter.current++;
        const col = n % 4;
        const row = Math.floor(n / 4);
        setItems((prev) => [
            ...prev,
            {
                i: `${b.id}-${Date.now()}-${n}`,
                blockId: b.id,
                x: snap(24 + col * (DEFAULT_W + 16)),
                y: snap(24 + row * (DEFAULT_H + 16)),
                w: DEFAULT_W,
                h: DEFAULT_H,
                display: "numeric",
            },
        ]);
    };

    const patch = (i: string, p: Partial<ViewItem>) =>
        setItems((prev) => prev.map((it) => (it.i === i ? { ...it, ...p } : it)));
    const remove = (i: string) => setItems((prev) => prev.filter((it) => it.i !== i));

    return (
        <div className="fixed inset-0 z-[60] flex flex-col bg-background">
            <div className="flex flex-row items-center justify-between border-b px-4 py-2.5 shrink-0">
                <div className="flex flex-row items-center gap-3">
                    <LayoutGrid className="w-4 h-4" />
                    <span className="font-semibold">Build MOPS View</span>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button
                                type="button"
                                title="View icon"
                                className="flex items-center justify-center w-8 h-8 rounded-md border hover:bg-secondary cursor-pointer shrink-0"
                            >
                                <ViewIcon icon={icon} className="w-4 h-4" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="p-2 w-auto">
                            <div className="grid grid-cols-5 gap-1">
                                {VIEW_ICON_KEYS.map((k) => (
                                    <button
                                        key={k}
                                        type="button"
                                        onClick={() => setIcon(k)}
                                        className={cn(
                                            "flex items-center justify-center rounded-md p-2 hover:bg-secondary cursor-pointer",
                                            icon === k && "bg-secondary ring-1 ring-blue-500/50"
                                        )}
                                    >
                                        <ViewIcon icon={k} className="w-4 h-4" />
                                    </button>
                                ))}
                            </div>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <Input
                        className="w-64 h-8"
                        placeholder="View name (e.g. EPS Overview)"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        autoFocus
                    />
                </div>
                <div className="flex flex-row items-center gap-2">
                    <span className="text-xs text-muted-foreground">{items.length} blocks</span>
                    <Button variant="ghost" onClick={props.onCancel}>Cancel</Button>
                    <Button disabled={!name.trim() || items.length === 0} onClick={() => props.onCreate(name.trim(), items, icon)}>
                        Save View
                    </Button>
                </div>
            </div>

            <div className="flex-1 flex flex-row min-h-0">
                <div className="w-64 shrink-0 border-r overflow-y-auto p-3 flex flex-col gap-4">
                    <p className="text-xs text-muted-foreground">Click a block to add it to the canvas, then drag to arrange and drag its corner to resize.</p>
                    {CATEGORY_ORDER.map((cat) => {
                        const meta = CATEGORY_META[cat];
                        return (
                            <div key={cat} className="flex flex-col gap-1.5">
                                <div className="flex flex-row items-center gap-1.5">
                                    <span className={cn("w-2 h-2 rounded-full", meta.dot)} />
                                    <h4 className={cn("text-xs font-semibold uppercase tracking-wide", meta.accent)}>{meta.label}</h4>
                                </div>
                                {byCategory[cat]?.map((b) => (
                                    <button
                                        key={b.id}
                                        onClick={() => addBlock(b)}
                                        className="flex flex-row items-center justify-between gap-2 rounded-md border border-border px-2.5 py-1.5 text-sm text-left text-muted-foreground hover:bg-secondary/60 hover:text-foreground cursor-pointer"
                                    >
                                        <span className="truncate">{b.label}</span>
                                        <Plus className="w-3.5 h-3.5 shrink-0" />
                                    </button>
                                ))}
                            </div>
                        );
                    })}
                </div>

                <div
                    className="flex-1 overflow-auto relative bg-secondary/20"
                    style={{
                        backgroundImage: "radial-gradient(circle, var(--border) 1px, transparent 1px)",
                        backgroundSize: `${GRID}px ${GRID}px`,
                    }}
                >
                    {items.length === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground pointer-events-none">
                            Add metric blocks from the palette to start building your view.
                        </div>
                    )}
                    <div className="relative min-h-full min-w-full" style={{ width: 2000, height: 1400 }}>
                        {items.map((it) => (
                            <EditorItem key={it.i} item={it} onChange={(p) => patch(it.i, p)} onRemove={() => remove(it.i)} />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
