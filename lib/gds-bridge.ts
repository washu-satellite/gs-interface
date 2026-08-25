export function bridgeBase(): string | null {
    const url = process.env.GDS_BRIDGE_URL;
    return url ? url.replace(/\/$/, "") : null;
}

export function bridgeHeaders(json = false): Record<string, string> {
    const headers: Record<string, string> = {};
    if (json) headers["Content-Type"] = "application/json";
    const key = process.env.GDS_BRIDGE_API_KEY;
    if (key) headers["Authorization"] = `Bearer ${key}`;
    return headers;
}
