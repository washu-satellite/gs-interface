import { ScalarDictionary } from "@/types/scalar";

export type ScalarBridgeState = "loading" | "ok" | "unconfigured" | "unreachable";

// Both calls go through the Next proxy rather than straight to gds-bridge, so
// the session check and uplink audit log can't be bypassed from the browser.

// Args are sent as strings; the GDS pipeline validates them against the dictionary
export async function sendScalarCommand(mnemonic: string, args: (string | number | boolean)[]) {
    const r = await fetch("/api/scalar/commands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mnemonic, args: args.map(String) })
    });

    const body = await r.json().catch(() => null);
    if (!r.ok) {
        throw new Error(body?.error ?? `Command failed with status ${r.status}`);
    }

    return body;
}

export async function fetchScalarDictionary(): Promise<{ dictionary: ScalarDictionary | null; state: ScalarBridgeState }> {
    try {
        const r = await fetch("/api/scalar/dictionary", { cache: "no-store" });
        if (r.status === 503) return { dictionary: null, state: "unconfigured" };
        if (r.status === 502) return { dictionary: null, state: "unreachable" };

        const body = await r.json().catch(() => null);
        if (!r.ok || !body) return { dictionary: null, state: "unreachable" };

        return { dictionary: body as ScalarDictionary, state: "ok" };
    } catch {
        return { dictionary: null, state: "unreachable" };
    }
}
