"use client";

import * as React from "react";
import { ResponsiveLine } from "@nivo/line";

import { bStore, MessageDetails } from "@/hooks/useAppStore";
import {
    Beacon,
    Beacon_HealthStatus,
    Beacon_OpsMode,
    NavigationUpdate,
} from "@/gen/airis/telemetry/v1/telemetry_pb";
import { StatField } from "@/components/stat-field";

type Point = { x: number; y: number };
type Serie = { id: string; data: Point[] };

// Pull a time series for each named numeric field out of the message log,
// keyed off the message's client-side receipt order.
function buildSeries(
    messages: MessageDetails[],
    id: MessageDetails["id"],
    fields: { key: string; label: string }[]
): Serie[] {
    const filtered = messages.filter((m) => m.id === id);
    return fields.map((f) => ({
        id: f.label,
        data: filtered.map((m, i) => ({
            x: i,
            y: Number((m.data as Record<string, unknown>)[f.key] ?? 0),
        })),
    }));
}

function nivoTheme(dark: boolean) {
    const text = dark ? "#a1a1aa" : "#52525b";
    const grid = dark ? "#27272a" : "#e4e4e7";
    return {
        text: { fill: text, fontSize: 11 },
        axis: {
            ticks: { text: { fill: text } },
            legend: { text: { fill: text } },
        },
        grid: { line: { stroke: grid, strokeWidth: 1 } },
        crosshair: { line: { stroke: text } },
        tooltip: {
            container: {
                background: dark ? "#18181b" : "#ffffff",
                color: dark ? "#fafafa" : "#18181b",
                fontSize: 12,
            },
        },
    };
}

function TelemetryChart(props: {
    title: string;
    unit?: string;
    series: Serie[];
    dark: boolean;
}) {
    const hasData = props.series.some((s) => s.data.length > 0);

    return (
        <div className="rounded-md border bg-secondary/30 p-4 flex flex-col h-72">
            <div className="flex items-baseline justify-between">
                <h3 className="font-semibold text-sm">{props.title}</h3>
                {props.unit && <span className="text-xs text-muted-foreground font-mono">{props.unit}</span>}
            </div>
            <div className="flex-1">
                {hasData ? (
                    <ResponsiveLine
                        data={props.series}
                        theme={nivoTheme(props.dark)}
                        margin={{ top: 16, right: 110, bottom: 32, left: 48 }}
                        xScale={{ type: "linear" }}
                        yScale={{ type: "linear", min: "auto", max: "auto" }}
                        axisBottom={{ legend: "samples", legendOffset: 26, legendPosition: "middle" }}
                        axisLeft={{ legendOffset: -40 }}
                        colors={{ scheme: "category10" }}
                        enablePoints={false}
                        useMesh={true}
                        enableTouchCrosshair={true}
                        legends={[
                            {
                                anchor: "bottom-right",
                                direction: "column",
                                translateX: 100,
                                itemWidth: 90,
                                itemHeight: 20,
                                symbolSize: 10,
                                symbolShape: "circle",
                            },
                        ]}
                    />
                ) : (
                    <div className="flex h-full items-center justify-center">
                        <p className="text-muted-foreground text-xs">Awaiting telemetry…</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function TelemetryView() {
    const _messages = bStore.use.messages();
    const _theme = bStore.use.theme();
    const dark = _theme === "dark";

    const latestBeacon = React.useMemo(() => {
        for (let i = _messages.length - 1; i >= 0; i--) {
            if (_messages[i].id === "airisBeacon") return _messages[i].data as Beacon;
        }
        return null;
    }, [_messages]);

    const latestNav = React.useMemo(() => {
        for (let i = _messages.length - 1; i >= 0; i--) {
            if (_messages[i].id === "navigationUpdate") return _messages[i].data as NavigationUpdate;
        }
        return null;
    }, [_messages]);

    const powerSeries = React.useMemo(
        () =>
            buildSeries(_messages, "airisBeacon", [
                { key: "batVoltage", label: "Bat Voltage (V)" },
                { key: "batCurrent", label: "Bat Current (A)" },
                { key: "solarCurrent", label: "Solar Current (A)" },
            ]),
        [_messages]
    );

    const thermalSeries = React.useMemo(
        () =>
            buildSeries(_messages, "airisBeacon", [
                { key: "obcTemp", label: "OBC Temp (°C)" },
                { key: "batTemp", label: "Battery Temp (°C)" },
            ]),
        [_messages]
    );

    const altitudeSeries = React.useMemo(
        () => buildSeries(_messages, "navigationUpdate", [{ key: "altitude", label: "Altitude (m)" }]),
        [_messages]
    );

    const pointingSeries = React.useMemo(
        () =>
            buildSeries(_messages, "navigationUpdate", [
                { key: "pointingAzimuth", label: "Azimuth (°)" },
                { key: "pointingElevation", label: "Elevation (°)" },
            ]),
        [_messages]
    );

    return (
        <div className="w-full space-y-4 p-1">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatField
                    title="Ops Mode"
                    value={latestBeacon ? Beacon_OpsMode[latestBeacon.mode] : "—"}
                />
                <StatField
                    title="Health"
                    value={latestBeacon ? Beacon_HealthStatus[latestBeacon.health] : "—"}
                />
                <StatField
                    title="Bat Voltage"
                    value={latestBeacon ? latestBeacon.batVoltage.toFixed(2) : "—"}
                    units="V"
                />
                <StatField
                    title="Altitude"
                    value={latestNav ? latestNav.altitude.toFixed(1) : "—"}
                    units="m"
                />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <TelemetryChart title="Power" unit="beacon" series={powerSeries} dark={dark} />
                <TelemetryChart title="Thermal" unit="beacon" series={thermalSeries} dark={dark} />
                <TelemetryChart title="Altitude" unit="navigation" series={altitudeSeries} dark={dark} />
                <TelemetryChart title="Pointing" unit="navigation" series={pointingSeries} dark={dark} />
            </div>
        </div>
    );
}
