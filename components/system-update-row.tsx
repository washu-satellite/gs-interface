"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"

type RepoStatus = {
    updateAvailable: boolean
    currentSha: string | null
    remoteSha: string | null
    error: string | null
}

type UpdateStatus = {
    repos: Record<string, RepoStatus>
    deploy: { deploying: boolean; lastResult: "success" | "failed" | null; lastError: string | null }
    updateAvailable: boolean
}

function shortSha(sha: string | null) {
    return sha ? sha.slice(0, 8) : "?"
}

export function SystemUpdateRow() {
    const [status, setStatus] = React.useState<UpdateStatus | null>(null)
    const [confirmOpen, setConfirmOpen] = React.useState(false)
    const [triggering, setTriggering] = React.useState(false)
    const [triggerError, setTriggerError] = React.useState<string | null>(null)

    const fetchStatus = React.useCallback(async () => {
        try {
            const res = await fetch("/api/system/update-status")
            if (res.ok) setStatus((await res.json()) as UpdateStatus)
        } catch {}
    }, [])

    React.useEffect(() => {
        fetchStatus()
    }, [fetchStatus])

    const triggerDeploy = async () => {
        setTriggering(true)
        setTriggerError(null)
        try {
            const res = await fetch("/api/system/deploy", { method: "POST" })
            const data = await res.json().catch(() => ({}))
            if (!res.ok) {
                setTriggerError(data?.reason || data?.error || `Deploy request failed (${res.status})`)
            } else {
                setConfirmOpen(false)
                fetchStatus()
            }
        } catch {
            setTriggerError("Could not reach the update service")
        } finally {
            setTriggering(false)
        }
    }

    return (
        <>
            <div className="flex flex-row items-center justify-between gap-6 px-5 py-3.5">
                <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="font-medium text-sm">Software version</span>
                    {status ? (
                        <div className="flex flex-col gap-0.5 text-xs text-muted-foreground font-mono">
                            {Object.entries(status.repos).map(([name, r]) => (
                                <span key={name}>
                                    {name}: {shortSha(r.currentSha)}
                                    {r.updateAvailable && ` (update available: ${shortSha(r.remoteSha)})`}
                                </span>
                            ))}
                        </div>
                    ) : (
                        <span className="text-xs text-muted-foreground">Loading...</span>
                    )}
                    {status?.deploy.lastResult === "failed" && (
                        <span className="text-xs text-red-600 dark:text-red-400">
                            Last deploy failed: {status.deploy.lastError}
                        </span>
                    )}
                    {triggerError && <span className="text-xs text-red-600 dark:text-red-400">{triggerError}</span>}
                </div>
                <div className="shrink-0 flex flex-row items-center gap-2">
                    {status?.deploy.deploying ? (
                        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Spinner className="size-4" /> Deploying...
                        </span>
                    ) : (
                        <>
                            <Button size="sm" variant="secondary" onClick={fetchStatus}>
                                Check for updates
                            </Button>
                            {status?.updateAvailable && (
                                <Button size="sm" onClick={() => setConfirmOpen(true)}>
                                    Deploy
                                </Button>
                            )}
                        </>
                    )}
                </div>
            </div>

            {confirmOpen && status && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/60"
                        onClick={() => !triggering && setConfirmOpen(false)}
                    />
                    <div className="relative z-10 w-full max-w-md rounded-lg border bg-background p-5 flex flex-col gap-4">
                        <h3 className="font-semibold">Redeploy ground station software?</h3>
                        <p className="text-sm text-muted-foreground">
                            This pulls the latest code and rebuilds/restarts gs-routing, gds, gds-bridge, and
                            gs-interface. Services will briefly go down during the restart.
                        </p>
                        <div className="flex flex-col gap-1 text-xs text-muted-foreground font-mono">
                            {Object.entries(status.repos).map(([name, r]) => (
                                <div key={name}>
                                    {name}: {shortSha(r.currentSha)} → {shortSha(r.remoteSha)}
                                </div>
                            ))}
                        </div>
                        <div className="flex flex-row justify-end gap-2">
                            <Button variant="secondary" onClick={() => setConfirmOpen(false)} disabled={triggering}>
                                Cancel
                            </Button>
                            <Button onClick={triggerDeploy} disabled={triggering}>
                                {triggering && <Spinner className="size-3.5" />}
                                Deploy now
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
