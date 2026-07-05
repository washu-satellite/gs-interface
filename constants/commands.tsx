import React, { ReactNode } from "react";
import { Satellite, Telescope } from "lucide-react";
import { CommandBadgeType } from "@/types/ui";
import { title } from "process";
import { create, Message } from "@bufbuild/protobuf";
import { z } from 'zod';
import { $ZodType, $ZodTypeInternals } from "zod/v4/core";
import { Form, FormProvider, useForm, UseFormReturn } from "react-hook-form";
import { MessageEnvelope, MessageSchema, PointingCmdSchema, SafeModeExitCmdSchema } from "@/gen/messages/transport/v1/transport_pb";
import { Button } from "@/components/ui/button";
import { FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { buildEnvelope } from "@/lib/utils";
import { bStore } from "@/hooks/useAppStore";
import { Input } from "@/components/ui/input";

type Group = 'AIRIS' | 'GS-2' | 'SCALAR' | 'Internal';

export const channelGroups: {
    group: Group,
    icon: ReactNode,
    channels: string[]
}[] = [
    {
        group: 'AIRIS',
        icon: <Telescope />,
        channels: [
            "Errors",
            "Warnings",
            "Telemetry",
            "Commands"
        ]
    },
    {
        group: 'SCALAR',
        icon: <Satellite />,
        channels: [
            "Errors",
            "Warnings",
            "Telemetry",
            "Commands"
        ]
    }
];

export type CommandDetails<T extends z.ZodObject> = {
    group: Group,
    id: string,
    description: string,
    badge: CommandBadgeType,

    // Form validators
    zodObj: T,
    zodToMessage: (data: z.infer<T>) => MessageEnvelope["messageBody"]["value"],

    messageEnvelopeId: MessageEnvelope["messageBody"]["case"],

    variants: VariantDetails[]
};

export type CommandFormProps = {
    onSubmit: (values: any) => void
};

export type VariantDetails = {
    id: string,
    description: string
};

const cmdFmtPointingCmd = z.object({
    targetAzimuth: z.coerce.number().min(0).max(360),
    targetElevation: z.coerce.number().min(0).max(90)
});

export const cmdPointingCmd: CommandDetails<typeof cmdFmtPointingCmd> = {
    group: 'AIRIS',
    id: "pointing_cmd",
    description: "Command AIRIS to point to a target azimuth and elevation",
    badge: 'promote',

    zodObj: cmdFmtPointingCmd,
    zodToMessage: (data) => create(PointingCmdSchema, {
        targetAzimuth: data.targetAzimuth,
        targetElevation: data.targetElevation
    }),

    messageEnvelopeId: 'pointingCmd',
    variants: []
};

export function CmdFormPointingCmd(props: CommandFormProps) {
    const form = useForm<z.infer<typeof cmdFmtPointingCmd>>({
        resolver: zodResolver(cmdFmtPointingCmd) as any,
        defaultValues: { targetAzimuth: 0, targetElevation: 0 }
    });

    return (
        <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(props.onSubmit)} className="space-y-4">
                <FormField control={form.control} name="targetAzimuth" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Azimuth (°)</FormLabel>
                        <FormControl><Input type="number" placeholder="0–360" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="targetElevation" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Elevation (°)</FormLabel>
                        <FormControl><Input type="number" placeholder="0–90" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <Button type="submit" className="bg-blue-600 hover:bg-blue-400 cursor-pointer">Send Command</Button>
            </form>
        </FormProvider>
    );
}

const cmdFmtSafeModeExit = z.object({
    force: z.boolean()
});

export const cmdSafeModeExit: CommandDetails<typeof cmdFmtSafeModeExit> = {
    group: 'AIRIS',
    id: "safe_mode_exit",
    description: "Command AIRIS to exit safe mode",
    badge: 'promote',

    zodObj: cmdFmtSafeModeExit,
    zodToMessage: (data) => create(SafeModeExitCmdSchema, { force: data.force }),

    messageEnvelopeId: 'safeModeExitCmd',
    variants: [
        { id: "force", description: "Force exit regardless of system state" }
    ]
};

export function CmdFormSafeModeExit(props: CommandFormProps) {
    const form = useForm<z.infer<typeof cmdFmtSafeModeExit>>({
        resolver: zodResolver(cmdFmtSafeModeExit),
        defaultValues: { force: false }
    });

    return (
        <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(props.onSubmit)} className="space-y-4">
                <FormField control={form.control} name="force" render={({ field }) => (
                    <FormItem className="flex flex-row items-center gap-3">
                        <FormControl>
                            <input type="checkbox" checked={field.value} onChange={field.onChange} />
                        </FormControl>
                        <FormLabel>Force exit</FormLabel>
                        <FormMessage />
                    </FormItem>
                )} />
                <Button type="submit" className="bg-orange-600 hover:bg-orange-400 cursor-pointer">Send Command</Button>
            </form>
        </FormProvider>
    );
}

// const cmdEstablishClient: CommandDetails = {
//     form: (<></>),
//     pbSchema: null,
//     id: "Internal::establish_client",
//     description: "Dummy message to practice with server",
//     badge: 'sub',
//     variants: []
// };

const cmdFmtInternalMessage = z.object({
    message: z.string(),
    heading: z.string()
});

export const cmdInternalMessage: CommandDetails<typeof cmdFmtInternalMessage> = {
    group: 'Internal',
    id: "message",
    description: "Dummy message to practice with server",
    badge: 'sub',

    zodObj: cmdFmtInternalMessage,
    zodToMessage: (data) => {
        console.log(`Got data: ${data.heading}, ${data.message}`);

        return create(MessageSchema, {
            heading: data.heading,
            message: data.message
        });
    },

    messageEnvelopeId: 'internalMessage',

    variants: []
};

export function CmdFormInternalMessage(props: CommandFormProps) {
    const form = useForm<z.infer<typeof cmdFmtInternalMessage>>({
        resolver: zodResolver(cmdFmtInternalMessage),
        defaultValues: {
            heading: "",
            message: ""
        }
    });

    return (
        <FormProvider {...form}>
            <form 
                onSubmit={form.handleSubmit(props.onSubmit)} 
                className="space-y-8"       
            >
                    <FormField
                        control={form.control}
                        name={'heading'}
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Heading</FormLabel>
                            <FormControl>
                                <Input placeholder="An Announcement..." {...field} />
                            </FormControl>
                            <FormDescription>
                                Message heading (title)
                            </FormDescription>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name={'message'}
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Message</FormLabel>
                            <FormControl>
                                <Textarea placeholder="Hello, World!" {...field} />
                            </FormControl>
                            <FormDescription>
                                Message to send to the server
                            </FormDescription>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                <div className="flex flex-row gap-2 items-center">
                    <Button type="submit" className="bg-blue-600 hover:bg-blue-400 cursor-pointer">Build</Button>
                    <p className="text-muted-foreground text-sm">Assemble a command line directive based on the above parameters</p>
                </div>
            </form>
        </FormProvider>
    );
}


const airisCommands = [
    cmdPointingCmd,
    cmdSafeModeExit
];

const internalCommands = [
    cmdInternalMessage
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

export const allCommands = [
    airisCommands,
    internalCommands
].flat();

export type CommandKey = keyof typeof commandDetails