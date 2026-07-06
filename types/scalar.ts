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
