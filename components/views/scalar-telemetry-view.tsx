"use client";

import * as React from "react";

import { bStore } from "@/hooks/useAppStore";
import { ScalarChannelSample, ScalarEventRecord } from "@/types/scalar";
import { cn } from "@/lib/utils";
import { formatScalarTime as formatTime, severityColor } from "@/lib/scalar-severity";

const EVENT_DISPLAY_LIMIT = 100;

function ChannelTable(props: { channels: Record<string, ScalarChannelSample> }) {
    const rows = Object.values(props.channels).sort((a, b) => a.name.localeCompare(b.name));

    return (
        <div className="rounded-md border bg-secondary/30 p-4 flex flex-col min-h-0">
            <h3 className="font-semibold text-sm mb-2">Channels</h3>
            {rows.length === 0 ? (
                <p className="text-sm text-muted-foreground">Waiting for telemetry...</p>
            ) : (
                <div className="overflow-y-auto min-h-0">
                    <table className="w-full text-sm font-mono">
                        <thead className="text-left text-muted-foreground">
                            <tr>
                                <th className="pr-4 font-normal">Channel</th>
                                <th className="pr-4 font-normal">Value</th>
                                <th className="font-normal">Time (UTC)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map(s => (
                                <tr key={s.name} className="border-t border-border/50">
                                    <td className="pr-4 py-1">{s.name}</td>
                                    <td className="pr-4 py-1">{s.text || String(s.value)}</td>
                                    <td className="py-1 text-muted-foreground">{formatTime(s.time)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

function EventLog(props: { events: (ScalarEventRecord & { seq: number })[] }) {
    const rows = props.events.slice(-EVENT_DISPLAY_LIMIT).reverse();

    return (
        <div className="rounded-md border bg-secondary/30 p-4 flex flex-col min-h-0">
            <h3 className="font-semibold text-sm mb-2">Events</h3>
            {rows.length === 0 ? (
                <p className="text-sm text-muted-foreground">No events received</p>
            ) : (
                <div className="overflow-y-auto min-h-0 flex flex-col gap-1">
                    {rows.map(e => (
                        <div key={e.seq} className="flex flex-row gap-3 text-sm font-mono">
                            <span className="text-muted-foreground shrink-0">{formatTime(e.time)}</span>
                            <span className={cn("shrink-0", severityColor(e.severity))}>{e.severity}</span>
                            <span className="text-muted-foreground shrink-0">{e.name}</span>
                            <span className="truncate">{e.message}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function ScalarTelemetryView() {
    const channels = bStore.use.scalarChannels();
    const events = bStore.use.scalarEvents();

    return (
        <div className="grid grid-rows-2 gap-4 h-full min-h-0">
            <ChannelTable channels={channels} />
            <EventLog events={events} />
        </div>
    );
}
