import React, { ReactNode } from "react";
import { airisCommands } from "./airis";
import { Satellite, Telescope } from "lucide-react";
import { CommandBadgeType } from "@/types/ui";
import { title } from "process";
import { create, Message } from "@bufbuild/protobuf";
import { z } from 'zod';
import { $ZodType, $ZodTypeInternals } from "zod/v4/core";
import { Form, FormProvider, useForm, UseFormReturn } from "react-hook-form";
import { MessageEnvelope, MessageSchema } from "@/gen/messages/transport/v1/transport_pb";
import { Button } from "@/components/ui/button";
import { FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { buildEnvelope } from "@/lib/utils";
import { bStore } from "@/hooks/useAppStore";
import { Input } from "@/components/ui/input";

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

type ZodFields = Readonly<{ [k: string]: $ZodType<unknown, unknown, $ZodTypeInternals<unknown, unknown>>; }>;

export type CommandDetails<T extends z.ZodObject> = {
    pbSchema: any,
    id: string,
    description: string,
    badge: CommandBadgeType,

    zodObj: T,
    form?: React.FC<CommandFormProps>,
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

export const cmdInternalMessage: CommandDetails<typeof cmdFmtInternalMessage> = {
    pbSchema: null,
    id: "Internal::message",
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


const internalCommands = [
    cmdInternalMessage
];

const internalMessages = [

]

export const commandDetails = [
    // {
    //     title: "AIRIS Commands",
    //     values: airisCommands
    // },
    {
        title: "Internal Commands",
        values: internalCommands
    }
];

export const allCommands = [
    internalCommands,
    // airisCommands
].flat();

export type CommandKey = keyof typeof commandDetails