export function severityColor(severity: string): string {
    if (severity.includes("FATAL")) return "text-red-500";
    if (severity.includes("WARNING")) return "text-amber-500";
    if (severity.includes("COMMAND")) return "text-blue-500";
    return "text-muted-foreground";
}

export type ScalarSeverityLevel = "critical" | "warning" | "info";

export function severityLevel(severity: string): ScalarSeverityLevel {
    if (severity.includes("FATAL")) return "critical";
    if (severity.includes("WARNING")) return "warning";
    return "info";
}

export function formatScalarTime(epochSeconds: number | null): string {
    if (epochSeconds === null || !Number.isFinite(epochSeconds))
        return "--:--:--";
    const d = new Date(epochSeconds * 1000);
    if (isNaN(d.getTime()))
        return "--:--:--";
    return d.toISOString().slice(11, 23);
}
