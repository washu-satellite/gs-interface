export type SimParam = {
    key: string;
    label: string;
    type: "number" | "select";
    default: number | string;
    min?: number;
    max?: number;
    step?: number;
    unit?: string;
    options?: { value: string; label: string }[];
    hint?: string;
};

export type SimScenario = {
    id: string;
    name: string;
    summary: string;
    description: string;
    defaultDurationMin: number;
    params: SimParam[];
};

export const SIM_DURATION_MIN = 10;
export const SIM_DURATION_MAX = 720;

export const SIM_SCENARIOS: SimScenario[] = [
    {
        id: "nominal-telemetry",
        name: "Nominal Telemetry",
        summary: "Steady-state beacon with light sensor noise — no faults injected.",
        description:
            "The baseline everything else is compared against: EPS, thermal, ADCS, and CDH channels stream at a fixed cadence with realistic sensor noise. Use it to verify the telemetry pipeline, dashboards, and the SCALAR pane under nominal conditions.",
        defaultDurationMin: 15,
        params: [
            { key: "rateHz", label: "Telemetry rate", type: "number", default: 1, min: 0.1, max: 10, step: 0.1, unit: "Hz" },
            { key: "noisePct", label: "Sensor noise", type: "number", default: 2, min: 0, max: 20, step: 0.5, unit: "%" },
        ],
    },
    {
        id: "eps-brownout",
        name: "EPS Brownout",
        summary: "Battery bus voltage sags below the undervoltage threshold, then recovers.",
        description:
            "During an eclipse / high-load window the battery bus voltage droops past the undervoltage limit, tripping a low-power WARNING and shedding non-critical loads before recovering on the next sun pass. Exercises power alarms and load-shed response.",
        defaultDurationMin: 20,
        params: [
            { key: "onsetMin", label: "Onset", type: "number", default: 5, min: 0, max: 720, step: 1, unit: "min", hint: "Minutes into the run before the sag begins." },
            { key: "minVoltage", label: "Trough voltage", type: "number", default: 6.4, min: 5, max: 8.4, step: 0.1, unit: "V" },
            { key: "recover", label: "Recovers", type: "select", default: "yes", options: [{ value: "yes", label: "Yes" }, { value: "no", label: "No (stays low)" }] },
        ],
    },
    {
        id: "thermal-excursion",
        name: "Thermal Excursion",
        summary: "A component overheats past its limit, crossing WARNING then FATAL.",
        description:
            "Temperature on the selected component ramps upward, crosses the WARNING and then FATAL thresholds, and emits over-temp EVRs. Tests thermal alarms, event coloring in the SCALAR event log, and operator response timing.",
        defaultDurationMin: 15,
        params: [
            { key: "component", label: "Component", type: "select", default: "battery", options: [
                { value: "battery", label: "Battery" },
                { value: "eps", label: "EPS board" },
                { value: "payload", label: "Payload" },
                { value: "obc", label: "OBC" },
            ] },
            { key: "onsetMin", label: "Onset", type: "number", default: 3, min: 0, max: 720, step: 1, unit: "min" },
            { key: "peakTempC", label: "Peak temp", type: "number", default: 65, min: 30, max: 120, step: 1, unit: "°C" },
        ],
    },
    {
        id: "comms-dropout",
        name: "Comms Link Loss",
        summary: "Downlink SNR collapses and telemetry gaps out, then resumes.",
        description:
            "Simulates an LOS / keyhole or antenna-pointing loss: downlink SNR drops, channels stop updating for a window, and a link-loss event fires before telemetry resumes. Exercises stale-data handling and the connection indicator.",
        defaultDurationMin: 15,
        params: [
            { key: "startMin", label: "Dropout start", type: "number", default: 4, min: 0, max: 720, step: 1, unit: "min" },
            { key: "durationSec", label: "Dropout length", type: "number", default: 90, min: 5, max: 3600, step: 5, unit: "s" },
            { key: "mode", label: "Severity", type: "select", default: "full", options: [{ value: "full", label: "Full LOS" }, { value: "partial", label: "Degraded SNR" }] },
        ],
    },
    {
        id: "adcs-tumble",
        name: "ADCS Tumble",
        summary: "Attitude control is lost and body rates diverge.",
        description:
            "Angular velocity climbs past nominal, the attitude quaternion spins freely, and a loss-of-attitude event fires. Tests the ADCS view and control-parameters panel under an off-nominal spin, plus recovery once control is regained.",
        defaultDurationMin: 15,
        params: [
            { key: "onsetMin", label: "Onset", type: "number", default: 2, min: 0, max: 720, step: 1, unit: "min" },
            { key: "tumbleRateDps", label: "Tumble rate", type: "number", default: 12, min: 1, max: 90, step: 1, unit: "°/s" },
        ],
    },
];
