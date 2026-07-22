export type BlockCategory = "power" | "attitude" | "comms" | "thermal" | "cdh" | "payload";

export type CategoryMeta = {
    label: string;
    tile: string;
    dot: string;
    accent: string;
    hex: string;
};

export const CATEGORY_META: Record<BlockCategory, CategoryMeta> = {
    power: {
        label: "Power",
        tile: "border-emerald-500/30 bg-emerald-500/5",
        dot: "bg-emerald-500",
        accent: "text-emerald-500",
        hex: "#10b981",
    },
    attitude: {
        label: "Attitude",
        tile: "border-blue-500/30 bg-blue-500/5",
        dot: "bg-blue-500",
        accent: "text-blue-500",
        hex: "#3b82f6",
    },
    comms: {
        label: "Comms",
        tile: "border-amber-500/30 bg-amber-500/5",
        dot: "bg-amber-500",
        accent: "text-amber-500",
        hex: "#f59e0b",
    },
    thermal: {
        label: "Thermal",
        tile: "border-red-500/30 bg-red-500/5",
        dot: "bg-red-500",
        accent: "text-red-500",
        hex: "#ef4444",
    },
    cdh: {
        label: "C&DH",
        tile: "border-violet-500/30 bg-violet-500/5",
        dot: "bg-violet-500",
        accent: "text-violet-500",
        hex: "#8b5cf6",
    },
    payload: {
        label: "Payload",
        tile: "border-fuchsia-500/30 bg-fuchsia-500/5",
        dot: "bg-fuchsia-500",
        accent: "text-fuchsia-500",
        hex: "#d946ef",
    },
};

export const CATEGORY_ORDER: BlockCategory[] = ["power", "attitude", "comms", "thermal", "cdh", "payload"];

export type MetricBlock = {
    id: string;
    label: string;
    category: BlockCategory;
    value: string;
    unit?: string;
    min?: number;
    max?: number;
};

export const METRIC_BLOCKS: MetricBlock[] = [
    { id: "bat_voltage", label: "Battery Voltage", category: "power", value: "7.42", unit: "V", min: 6, max: 8.4 },
    { id: "bat_current", label: "Battery Current", category: "power", value: "1.18", unit: "A", min: 0, max: 3 },
    { id: "soc", label: "State of Charge", category: "power", value: "86", unit: "%", min: 0, max: 100 },
    { id: "solar_power", label: "Solar Array Power", category: "power", value: "12.4", unit: "W", min: 0, max: 20 },

    { id: "ang_vel", label: "Angular Velocity", category: "attitude", value: "0.42", unit: "°/s", min: 0, max: 5 },
    { id: "pointing_err", label: "Pointing Error", category: "attitude", value: "1.05", unit: "°", min: 0, max: 10 },
    { id: "wheel_rpm", label: "Reaction Wheel", category: "attitude", value: "3120", unit: "rpm", min: 0, max: 6000 },
    { id: "sun_angle", label: "Sun Angle", category: "attitude", value: "38.6", unit: "°", min: 0, max: 180 },

    { id: "link_snr", label: "Link SNR", category: "comms", value: "10.24", unit: "dB", min: 0, max: 20 },
    { id: "downlink_rate", label: "Downlink Rate", category: "comms", value: "256", unit: "kbps", min: 0, max: 512 },
    { id: "rssi", label: "RSSI", category: "comms", value: "-96", unit: "dBm", min: -120, max: -60 },
    { id: "packets", label: "Packets / s", category: "comms", value: "48", min: 0, max: 100 },

    { id: "bat_temp", label: "Battery Temp", category: "thermal", value: "21.3", unit: "°C", min: -20, max: 60 },
    { id: "obc_temp", label: "OBC Temp", category: "thermal", value: "34.8", unit: "°C", min: -20, max: 60 },
    { id: "payload_temp", label: "Payload Temp", category: "thermal", value: "-4.2", unit: "°C", min: -40, max: 40 },

    { id: "cpu_load", label: "CPU Load", category: "cdh", value: "37", unit: "%", min: 0, max: 100 },
    { id: "mem_used", label: "Memory Used", category: "cdh", value: "62", unit: "%", min: 0, max: 100 },
    { id: "uptime", label: "Uptime", category: "cdh", value: "14d 06h" },
    { id: "boot_count", label: "Boot Count", category: "cdh", value: "212", min: 0, max: 500 },

    { id: "frames", label: "Frames Captured", category: "payload", value: "1,284", min: 0, max: 2000 },
    { id: "buffer_used", label: "Buffer Used", category: "payload", value: "41", unit: "%", min: 0, max: 100 },
    { id: "sensor_gain", label: "Sensor Gain", category: "payload", value: "18", unit: "dB", min: 0, max: 30 },
];

export function numericValue(block: MetricBlock): number {
    const n = parseFloat(String(block.value).replace(/[^0-9.-]/g, ""));
    return Number.isFinite(n) ? n : NaN;
}

export function gaugeRange(block: MetricBlock): [number, number] {
    if (block.min != null && block.max != null) return [block.min, block.max];
    const v = numericValue(block);
    return [0, Number.isFinite(v) ? Math.max(1, v * 1.5) : 1];
}

export function gaugePct(block: MetricBlock): number {
    const v = numericValue(block);
    if (!Number.isFinite(v)) return 0;
    const [min, max] = gaugeRange(block);
    if (max === min) return 0;
    return Math.max(0, Math.min(1, (v - min) / (max - min)));
}

export const BLOCKS_BY_ID: Record<string, MetricBlock> = Object.fromEntries(
    METRIC_BLOCKS.map((b) => [b.id, b])
);

export type DisplayType = "numeric" | "timeseries" | "gauge";

export const DISPLAY_TYPES: { value: DisplayType; label: string }[] = [
    { value: "numeric", label: "Numeric" },
    { value: "timeseries", label: "Time-series" },
    { value: "gauge", label: "Gauge" },
];

export type ViewItem = {
    i: string;
    blockId: string;
    x: number;
    y: number;
    w: number;
    h: number;
    display: DisplayType;
};

export type DashboardView = {
    id: number;
    projectId: string;
    name: string;
    blocks: ViewItem[];
    ord: number;
    icon?: string;
};

export function seededSeries(item: ViewItem, block: MetricBlock, points = 24) {
    const base = parseFloat(String(block.value).replace(/[^0-9.-]/g, "")) || 10;
    let seed = [...item.blockId].reduce((a, c) => a + c.charCodeAt(0), 7);
    const rand = () => {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
    };
    return Array.from({ length: points }, (_, x) => ({
        x,
        y: +(base * (0.82 + 0.36 * rand())).toFixed(2),
    }));
}
