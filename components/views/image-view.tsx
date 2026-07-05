"use client";

import * as React from "react";
import { ImageOff, X } from "lucide-react";

import { bStore, MessageDetails } from "@/hooks/useAppStore";
import { Message } from "@/gen/messages/transport/v1/transport_pb";
import { resolveImageUrl } from "@/constants/host";
import { cn } from "@/lib/utils";

export type ImageFrame = {
    url: string;
    rawPath: string;
    burstId: string;
    seq: number;
    timestamp: Date;
};

// Image frames arrive on the `airis:image` channel as InternalMessages whose
// heading is "image" and whose message body is the backend-relative path the
// gs-routing image store wrote, e.g. `/images/<burst_id>/<seq>.bin`.
export function isImageMessage(m: MessageDetails): boolean {
    return m.id === "internalMessage" && (m.data as Message).heading === "image";
}

export function parseFrame(m: MessageDetails): ImageFrame | null {
    if (!isImageMessage(m)) return null;
    const path = (m.data as Message).message;
    const match = path.match(/\/images\/([^/]+)\/(\d+)/);
    return {
        url: resolveImageUrl(path),
        rawPath: path,
        burstId: match?.[1] ?? "unknown",
        seq: match ? Number(match[2]) : 0,
        timestamp: m.timestamp,
    };
}

/**
 * Renders a single burst frame, degrading gracefully to a download link if the
 * backend has not (yet) served the path or the bytes are not a browser-renderable
 * image format.
 */
export function FrameImage(props: { path: string; className?: string; onClick?: () => void }) {
    const [error, setError] = React.useState(false);
    const url = resolveImageUrl(props.path);

    if (error) {
        return (
            <div
                className={cn(
                    "flex flex-col items-center justify-center gap-1 bg-muted text-muted-foreground text-[0.65rem] p-3 text-center",
                    props.className
                )}
            >
                <ImageOff className="w-5 h-5" />
                <span>frame unavailable</span>
                <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="underline break-all"
                    onClick={(e) => e.stopPropagation()}
                >
                    {props.path}
                </a>
            </div>
        );
    }

    return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
            src={url}
            alt={props.path}
            onError={() => setError(true)}
            onClick={props.onClick}
            className={props.className}
        />
    );
}

function groupByBurst(frames: ImageFrame[]): [string, ImageFrame[]][] {
    const groups = new Map<string, ImageFrame[]>();
    for (const f of frames) {
        const list = groups.get(f.burstId) ?? [];
        list.push(f);
        groups.set(f.burstId, list);
    }
    return Array.from(groups.entries())
        // most recently active burst first
        .sort((a, b) => {
            const ta = Math.max(...a[1].map((f) => f.timestamp.getTime()));
            const tb = Math.max(...b[1].map((f) => f.timestamp.getTime()));
            return tb - ta;
        })
        .map(([burst, list]) => [burst, list.sort((x, y) => x.seq - y.seq)] as [string, ImageFrame[]]);
}

export default function ImageView() {
    const _messages = bStore.use.messages();
    const [enlarged, setEnlarged] = React.useState<ImageFrame | null>(null);

    const frames = React.useMemo(
        () => _messages.map(parseFrame).filter((f): f is ImageFrame => f !== null),
        [_messages]
    );

    const bursts = React.useMemo(() => groupByBurst(frames), [frames]);

    if (frames.length === 0) {
        return (
            <div className="flex h-full items-center justify-center">
                <p className="text-muted-foreground text-sm">No burst imagery received yet.</p>
            </div>
        );
    }

    return (
        <div className="w-full space-y-8">
            {bursts.map(([burstId, list]) => (
                <div key={burstId}>
                    <div className="flex items-baseline gap-3 mb-2">
                        <h3 className="font-semibold">
                            Burst <span className="font-mono">{burstId}</span>
                        </h3>
                        <span className="text-xs text-muted-foreground">
                            {list.length} frame{list.length === 1 ? "" : "s"}
                        </span>
                    </div>
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(8rem,1fr))] gap-3">
                        {list.map((frame) => (
                            <button
                                key={frame.rawPath}
                                onClick={() => setEnlarged(frame)}
                                className="group relative aspect-square overflow-hidden rounded-md border bg-secondary/30 cursor-pointer"
                            >
                                <FrameImage
                                    path={frame.rawPath}
                                    className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                                />
                                <span className="absolute bottom-0 right-0 bg-background/80 px-1.5 py-0.5 font-mono text-[0.65rem]">
                                    #{frame.seq}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            ))}

            {enlarged && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-8"
                    onClick={() => setEnlarged(null)}
                >
                    <button
                        className="absolute top-4 right-4 text-white/80 hover:text-white cursor-pointer"
                        onClick={() => setEnlarged(null)}
                    >
                        <X className="w-6 h-6" />
                    </button>
                    <div className="flex flex-col items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <FrameImage
                            path={enlarged.rawPath}
                            className="max-h-[80vh] max-w-[90vw] rounded-md object-contain"
                        />
                        <p className="font-mono text-xs text-white/70">
                            burst {enlarged.burstId} · frame #{enlarged.seq} ·{" "}
                            {enlarged.timestamp.toLocaleString("en-US")}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
