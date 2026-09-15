// Payloads published by gds-bridge on the scalar:* channels — keep in sync
// with gs-routing/gds-bridge/bridge.py.

export type ScalarChannelSample = {
    kind: "channel",
    id: number,
    name: string,
    // unix epoch seconds (spacecraft time)
    time: number | null,
    value: number | string | boolean | null,
    text: string
};

export type ScalarEventRecord = {
    kind: "event",
    id: number,
    name: string,
    time: number | null,
    severity: string,
    message: string
};

export type ScalarMessage = ScalarChannelSample | ScalarEventRecord;

export type ScalarCommandArg = {
    name: string,
    description: string | null,
    type: string
};

export type ScalarCommandSpec = {
    name: string,
    opcode: number,
    description: string | null,
    args: ScalarCommandArg[]
};

export type ScalarDictionary = {
    commands: ScalarCommandSpec[],
    channels: { name: string, id: number, description: string | null }[],
    events: { name: string, id: number, severity: string }[]
};

export type DelayBlockConfig = { seconds: number };

export type WaitEventBlockConfig = { eventName: string; timeoutSec: number };

export type QueueItemStatus = "queued" | "sending" | "error";

type QueuedItemBase = {
    id: number,
    projectId: string,
    ord: number,
    status: QueueItemStatus,
    error: string | null,
    queuedBy: string,
    queuedByName: string | null,
    createdAt: string
};

export type QueuedCommandItem = QueuedItemBase & {
    kind: "command",
    mnemonic: string,
    args: string[]
};

export type QueuedBlockItem = QueuedItemBase & {
    kind: "block",
    blockType: "delay" | "wait_event",
    blockConfig: DelayBlockConfig | WaitEventBlockConfig
};

export type QueuedItem = QueuedCommandItem | QueuedBlockItem;

export type ScalarLinkStatus = "ok" | "stale" | "no_data_yet" | "unreachable" | "unconfigured";

export type ScalarBridgeHealth = {
    status: ScalarLinkStatus;
    secondsSinceLastData: number | null;
};
