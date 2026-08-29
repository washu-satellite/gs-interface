export type PassStatus = "active" | "upcoming" | "none";

export type NextPassInfo = {
    status: PassStatus;
    label: string;
    secondsRemaining: number | null;
};
