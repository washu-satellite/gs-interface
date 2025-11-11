import { ReactNode } from "react";
import { airisCommands } from "./airis";
import { Satellite, Telescope } from "lucide-react";
import { CommandBadgeType } from "@/types/ui";
import { title } from "process";

export const channelGroups = [
    {
        title: "AIRIS",
        icon: <Telescope />,
        channels: [
            "Errors",
            "Warnings",
            "Telemetry",
            "Commands"
        ]
    },
    {
        title: "SCALAR",
        icon: <Satellite />,
        channels: [
            "Errors",
            "Warnings",
            "Telemetry",
            "Commands"
        ]
    }
];

export type CommandDetails = {
    form: ReactNode,
    pbSchema: any,
    id: string,
    description: string,
    badge: CommandBadgeType,
    variants: VariantDetails[]
};

export type VariantDetails = {
    id: string,
    description: string
};

const cmdEstablishClient: CommandDetails = {
    form: (<></>),
    pbSchema: null,
    id: "Internal::establish_client",
    description: "Dummy message to practice with server",
    badge: 'sub',
    variants: []
};

const internalCommands = [
    cmdEstablishClient
];

export const commandDetails = [
    {
        title: "AIRIS Commands",
        values: airisCommands
    },
    {
        title: "Internal Commands",
        values: internalCommands
    }
];

export type CommandKey = keyof typeof commandDetails