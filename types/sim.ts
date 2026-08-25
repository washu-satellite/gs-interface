export type SimState = "running" | "paused" | "ended";

export type SimStatus = {
    active: boolean;
    runId?: string;
    scenarioId?: string;
    state?: SimState;
    durationMin?: number;
    elapsedSec?: number;
};

export type SimEngineState = "loading" | "ok" | "unconfigured" | "unreachable";
