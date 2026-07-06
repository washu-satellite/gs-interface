import { GDS_BRIDGE_HTTP_HOST } from "@/constants/host";
import { ScalarDictionary } from "@/types/scalar";

// Args are sent as strings; the GDS pipeline validates them against the dictionary
export async function sendScalarCommand(mnemonic: string, args: (string | number | boolean)[]) {
    const r = await fetch(`${GDS_BRIDGE_HTTP_HOST}/commands`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mnemonic, args: args.map(String) })
    });

    if (!r.ok) {
        const body = await r.json().catch(() => null);
        throw new Error(body?.error ?? `Command failed with status ${r.status}`);
    }

    return r.json();
}

export async function fetchScalarDictionary(): Promise<ScalarDictionary> {
    const r = await fetch(`${GDS_BRIDGE_HTTP_HOST}/dictionary`);
    if (!r.ok)
        throw new Error(`Failed to fetch SCALAR dictionary (status ${r.status})`);
    return r.json();
}
