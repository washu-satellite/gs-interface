"use client"

import * as React from "react"
import { RefreshCw, Sparkles, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"

type RepoStatus = {
    updateAvailable: boolean
    currentSha: string | null
    remoteSha: string | null
    currentSubject: string | null
    error: string | null
}

type UpdateStatus = {
    repos: Record<string, RepoStatus>
    deploy: {
        deploying: boolean
        lastResult: "success" | "failed" | null
        lastError: string | null
        lastFinishedAt: string | null
    }
    updateAvailable: boolean
}

const POLL_INTERVAL_MS = 5 * 60 * 1000
const FAST_POLL_INTERVAL_MS = 5 * 1000
const DISMISS_UPDATE_KEY = "gs-update-banner-dismissed-sha"
const DISMISS_FAILURE_KEY = "gs-update-banner-dismissed-failure"

function shortSha(sha: string | null) {
    return sha ? sha.slice(0, 8) : "?"
}

export function UpdateBanner() {
    const [status, setStatus] = React.useState<UpdateStatus | null>(null)
    const [dismissedUpdate, setDismissedUpdate] = React.useState<string | null>(null)
    const [dismissedFailure, setDismissedFailure] = React.useState<string | null>(null)
    const [confirmOpen, setConfirmOpen] = React.useState(false)
    const [triggering, setTriggering] = React.useState(false)
    const [triggerError, setTriggerError] = React.useState<string | null>(null)

    const fetchStatus = React.useCallback(async () => {
        try {
            const res = await fetch("/api/system/update-status")
            if (!res.ok) return
            setStatus((await res.json()) as UpdateStatus)
        } catch {}
    }, [])

    React.useEffect(() => {
        try {
            setDismissedUpdate(sessionStorage.getItem(DISMISS_UPDATE_KEY))
            setDismissedFailure(sessionStorage.getItem(DISMISS_FAILURE_KEY))
        } catch {}
        fetchStatus()
    }, [fetchStatus])

    React.useEffect(() => {
        const interval = status?.deploy.deploying ? FAST_POLL_INTERVAL_MS : POLL_INTERVAL_MS
        const id = setInterval(fetchStatus, interval)
        return () => clearInterval(id)
    }, [status?.deploy.deploying, fetchStatus])

    if (!status) return null

    const updateKey = Object.values(status.repos)
        .map((r) => r.remoteSha ?? "")
        .join(":")
    const failureKey = status.deploy.lastFinishedAt ?? ""

    const deploying = status.deploy.deploying
    const showUpdate = status.updateAvailable && !deploying && dismissedUpdate !== updateKey
    const showFailure =
        !deploying && status.deploy.lastResult === "failed" && dismissedFailure !== failureKey

    if (!deploying && !showUpdate && !showFailure) return null

    const dismissUpdate = () => {
        try {
            sessionStorage.setItem(DISMISS_UPDATE_KEY, updateKey)
        } catch {}
        setDismissedUpdate(updateKey)
    }

    const dismissFailure = () => {
        try {
            sessionStorage.setItem(DISMISS_FAILURE_KEY, failureKey)
        } catch {}
        setDismissedFailure(failureKey)
    }

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
            <div className="w-full bg-amber-500/15 border-b border-amber-500/30 text-sm px-4 py-2 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    {deploying ? (
                        <>
                            <Spinner className="size-4" />
                            <span>Redeploying ground station software...</span>
                        </>
                    ) : showFailure ? (
                        <span className="text-red-600 dark:text-red-400">
                            Last deploy failed: {status.deploy.lastError}
                        </span>
                    ) : (
                        <>
                            <Sparkles className="size-4" />
                            <span>New version available</span>
                        </>
                    )}
                    {triggerError && <span className="text-red-600 dark:text-red-400">{triggerError}</span>}
                </div>
                {!deploying && (
                    <div className="flex items-center gap-2">
                        {showUpdate && (
                            <Button size="sm" variant="secondary" onClick={() => setConfirmOpen(true)}>
                                <RefreshCw className="size-3.5" />
                                Deploy
                            </Button>
                        )}
                        <button
                            onClick={showFailure ? dismissFailure : dismissUpdate}
                            className="p-1 -m-1 rounded text-muted-foreground hover:text-foreground cursor-pointer"
                            aria-label="Dismiss"
                        >
                            <X className="size-4" />
                        </button>
                    </div>
                )}
            </div>

            {confirmOpen && (
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
