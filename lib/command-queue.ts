import type { DelayBlockConfig, QueuedCommandItem, QueuedItem, WaitEventBlockConfig } from "@/types/scalar";

export async function fetchCommandQueue(projectId: string): Promise<QueuedItem[]> {
    const r = await fetch(`/api/projects/${projectId}/command-queue`, { cache: "no-store" });
    if (!r.ok) throw new Error(`Failed to load command queue (${r.status})`);
    return r.json();
}

export async function enqueueCommand(
    projectId: string,
    mnemonic: string,
    args: (string | number | boolean)[]
): Promise<QueuedCommandItem> {
    const r = await fetch(`/api/projects/${projectId}/command-queue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "command", mnemonic, args: args.map(String) }),
    });
    const body = await r.json().catch(() => null);
    if (!r.ok) throw new Error(body?.error ?? `Failed to queue command (${r.status})`);
    return body;
}

export async function enqueueBlock(
    projectId: string,
    blockType: "delay" | "wait_event",
    blockConfig: DelayBlockConfig | WaitEventBlockConfig
): Promise<QueuedItem> {
    const r = await fetch(`/api/projects/${projectId}/command-queue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "block", blockType, blockConfig }),
    });
    const body = await r.json().catch(() => null);
    if (!r.ok) throw new Error(body?.error ?? `Failed to insert block (${r.status})`);
    return body;
}

export async function reorderCommandQueue(projectId: string, orderedIds: number[]): Promise<void> {
    await fetch(`/api/projects/${projectId}/command-queue`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: orderedIds }),
    });
}

export async function deleteQueuedCommand(id: number): Promise<void> {
    const r = await fetch(`/api/command-queue/${id}`, { method: "DELETE" });
    if (!r.ok) throw new Error(`Failed to remove queued item (${r.status})`);
}

export async function retryQueuedItem(id: number): Promise<void> {
    const r = await fetch(`/api/command-queue/${id}`, { method: "PATCH" });
    if (!r.ok) throw new Error(`Failed to retry item (${r.status})`);
}

export class ClaimConflictError extends Error {}

export async function sendQueuedCommand(id: number): Promise<void> {
    const r = await fetch(`/api/command-queue/${id}/send`, { method: "POST" });
    if (r.status === 409) throw new ClaimConflictError("Already claimed elsewhere");
    const body = await r.json().catch(() => null);
    if (!r.ok) throw new Error(body?.error ?? `Command failed with status ${r.status}`);
}

export async function fetchAutoRelease(projectId: string): Promise<boolean> {
    const r = await fetch(`/api/projects/${projectId}/command-queue/settings`, { cache: "no-store" });
    if (!r.ok) return false;
    const body = await r.json().catch(() => null);
    return body?.autoRelease === true;
}

export async function setAutoRelease(projectId: string, autoRelease: boolean): Promise<void> {
    await fetch(`/api/projects/${projectId}/command-queue/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ autoRelease }),
    });
}
