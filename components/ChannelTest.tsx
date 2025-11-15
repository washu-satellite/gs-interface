"use client";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "./ui/resizable";
import { Collapsible, CollapsibleTrigger } from "./ui/collapsible";
import { Button } from "./ui/button";
import { Check, ChevronDown, ChevronUp, CircleQuestionMark, EllipsisVertical, Hash, TriangleAlert } from "lucide-react";
import { CollapsibleContent } from "./ui/collapsible";
import { Checkbox } from "./ui/checkbox";
import { Label } from "./ui/label";
import React, { ReactNode, useEffect, useState } from "react";
import { Badge } from "./ui/badge";
import clsx from "clsx";
import { Input } from "./ui/input";
import { CheckedState } from "@radix-ui/react-checkbox";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "./ui/form";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Textarea } from "./ui/textarea";
import { bStore } from "@/hooks/useAppStore";
import { EstablishClientSchema, MessageEnvelope } from "@/gen/messages/transport/v1/transport_pb";
import { create } from "@bufbuild/protobuf";
import { buildEnvelope } from "@/lib/utils";
import { CommandBadgeType } from "@/types/ui";
import { allCommands, channelGroups, CmdFormInternalMessage, cmdInternalMessage, CommandDetails, commandDetails, CommandFormProps } from "@/constants/commands";
import { LogTable } from "./LogTable";
import { Avatar, AvatarImage } from "./ui/avatar";
import { AvatarFallback } from "@radix-ui/react-avatar";
import { authClient } from "@/lib/auth-client";
import { redirect } from "next/navigation";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

const ChannelSelection = (props: {
    val: string,
    checked: boolean,
    onCheckedChange(checked: CheckedState): void
}) => {
    return (
        <Label className="hover:bg-accent flex items-start gap-3 rounded-lg border p-3 m-4 has-aria-checked:border-blue-600 has-aria-checked:bg-blue-50 dark:has-aria-checked:border-blue-900 dark:has-aria-checked:bg-blue-950">
            <Checkbox
                id={props.val}
                checked={props.checked}
                onCheckedChange={props.onCheckedChange}
                className="data-[state=checked]:border-blue-600 data-[state=checked]:bg-blue-600 data-[state=checked]:text-white dark:data-[state=checked]:border-blue-700 dark:data-[state=checked]:bg-blue-700"
            />
            <div className="grid gap-1.5 font-normal">
            <p className="text-sm leading-none font-medium">
                {props.val}
            </p>
            <p className="text-muted-foreground text-sm">
                This is a channel
            </p>
            </div>
        </Label>
    );
}

// const formSchema = z.object({
//   message: z.string().min(2, {
//     message: "Username must be at least 2 characters.",
//   }),
// });

// function parseZod(zodObj: z.ZodObject, data: unknown) {
//     try {
//         zodObj.parse(data);
//     } catch (error) {
//         if (error instanceof z.ZodError) {
//             return error;
//         } else {
//             return {
//                 unknownError: error
//             };
//         }
//     }
//     return null;
// }

// function CommandEditor<T extends z.ZodObject>(props: {
//     commandDetails: CommandDetails<T>
// }) {
//     const _client = bStore.use.client();
//     const _subscriptions = bStore.use.subscriptions();

    

//     async function onSubmit(values: any) {
//         if (!props.commandDetails)
//             return;

//         const message = props.commandDetails.zodToMessage(values);

//         const bytes = buildEnvelope("0", props.commandDetails.messageEnvelopeId, message);

//         if (!_client)
//             return;
        
//         _client.send(bytes).catch(e => {
//             console.log(e);
//         })

//         // _subscriptions.get("internal")?.publish(bytes).catch(e => {
//         //     console.log(e);
//         // });
//     }

//     const shape = props.commandDetails.zodObj.shape;

//     return (
//         <Form {...form}>
//             <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
//                     <FormField
//                         control={form.control}
//                         name={k}
//                         render={({ field }) => (
//                             <FormItem>
//                             <FormLabel>Message</FormLabel>
//                             <FormControl>
//                                 <Textarea placeholder="Hello, World!" {...field} />
//                             </FormControl>
//                             <FormDescription>
//                                 Message to send to the server
//                             </FormDescription>
//                             <FormMessage />
//                             </FormItem>
//                         )}
//                     />
//                 <div className="flex flex-row gap-2 items-center">
//                     <Button type="submit" className="bg-blue-600 hover:bg-blue-400 cursor-pointer">Build</Button>
//                     <p className="text-muted-foreground text-sm">Assemble a command line directive based on the above parameters</p>
//                 </div>
//             </form>
//             </Form>
//     )
// }

export const ChannelBadge = (props: {
    value: string
}) => {
    return (
        <Badge className={clsx(
            props.value.toLowerCase().includes("error") 
                ? "bg-red-100 border-red-500 text-red-600 dark:bg-red-900 dark:border-red-700 dark:text-white"
                : props.value.toLowerCase().includes("warning")
                    ? "bg-amber-100 border-amber-500 text-amber-600 dark:bg-amber-900 dark:border-amber-700 dark:text-white"
                    : "bg-blue-100 border-blue-500 text-black dark:bg-blue-900 dark:border-blue-600 dark:text-foreground"
        )}>
            {props.value.toLowerCase()}
        </Badge>
    );
}

const ChannelMenu = (props: {
    title: string,
    icon: ReactNode,
    channels: string[]
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [values, setValues] = useState<{
        value: string,
        isChecked: boolean
    }[]>(props.channels.map(c => ({
        value: c,
        isChecked: false
    })));

    const _addChannel = bStore.use.addChannel();
    const _removeChannel = bStore.use.removeChannel();

    const filtered = values.filter(v => v.isChecked);

    return (
        <Collapsible
            open={isOpen}
            onOpenChange={setIsOpen}
            className={clsx(
                isOpen ? "bg-secondary/40" : "hover:bg-secondary",
                "rounded-lg"
            )}
        >
            <CollapsibleTrigger asChild>
                <div className="">
                <div className="cursor-pointer flex flex-row justify-between items-center w-full group relative">
                    <div className="flex flex-row gap-2 overflow-hidden text-muted-foreground p-2">
                        <div className="flex-1">
                            {props.icon}
                        </div>
                        <p className="flex-1 shrink-0 whitespace-nowrap font-medium text-sm pt-px">{props.title} Channels</p>
                    </div>
                    <Button variant="ghost" size="icon">
                        <EllipsisVertical className={clsx(
                            "size-5",
                            // isOpen ? "rotate-180" : ""
                            "hidden group-hover:block"
                        )}/>
                        <span className="sr-only">Toggle</span>
                    </Button>
                </div>
                {filtered.length > 0 &&
                    <div className="flex flex-row items-center gap-2 overflow-hidden pl-2 pb-2">
                        {filtered.map((v, i) => (
                            <ChannelBadge key={i} value={v.value}/>
                        ))}
                    </div>
                }
                </div>
            </CollapsibleTrigger>
            <CollapsibleContent
                className="overflow-hidden 
                        transition-all duration-100
                        data-[state=closed]:animate-collapsible-up
                        data-[state=open]:animate-collapsible-down"
            >
                {values.map((v, i) => (
                    <ChannelSelection
                        key={i}
                        val={v.value}
                        checked={v.isChecked}
                        onCheckedChange={(checked) => {
                            const val = v.value.toLowerCase();

                            if (checked.valueOf()) {
                                _addChannel(val);
                            } else {
                                _removeChannel(val);
                            }

                            console.log(bStore.getState().openChannels);

                            setValues(v => v.map((v1, j) => (
                                i == j ? ({ value: v1.value, isChecked: checked.valueOf() !== false }) : v1
                            )))
                        }}
                    />
                ))}
            </CollapsibleContent>
        </Collapsible>
    );
}

const CommandBadge = (props: {
    badge: CommandBadgeType
}) => {
    switch (props.badge) {
        case 'promote':
            return (
                <div className="border border-blue-500 bg-blue-200 dark:bg-blue-500 p-0.5 px-1 rounded-md">
                    <ChevronUp className="w-5"/>
                </div>
            );
        case 'sub':
            return (
                <div className="border border-blue-500 bg-blue-200 dark:bg-blue-500 p-0.5 px-1.5 rounded-md">
                    <Hash className="w-4"/>
                </div>
            );
        default:
            return <></>;
    }
}

const CommandEntry = (props: {
    id: string,
    description?: string,
    badge: CommandBadgeType,
    filterTerm?: string,
    selectItem?: () => void
}) => {
    let idElm: ReactNode = props.id;
    let descElm: ReactNode = props.description;
    if (props.filterTerm) {
        if (props.id.toLowerCase().includes(props.filterTerm)) {
            const index = props.id.toLowerCase().indexOf(props.filterTerm);
            idElm = (
                <>
                <span>{props.id.slice(0, index)}</span>
                <span className="font-bold">{props.id.slice(index, index + props.filterTerm.length)}</span>
                <span>{props.id.slice(index + props.filterTerm.length)}</span>
                </>
            );
        }
        if (props.description?.toLowerCase().includes(props.filterTerm)) {
            const index = props.description.toLowerCase().indexOf(props.filterTerm);
            descElm = (
                <>
                <span>{props.description.slice(0, index)}</span>
                <span className="font-semibold">{props.description.slice(index, index + props.filterTerm.length)}</span>
                <span>{props.description.slice(index + props.filterTerm.length)}</span>
                </>
            );
        }
    }

    return (
        <div
            tabIndex={0}
            className="bg-blue-100 text-blue-600 hover:bg-blue-200 dark:bg-blue-950 dark:hover:bg-blue-900 dark:text-blue-100 hover:cursor-pointer p-4 rounded-lg tabindex"
            onClick={props.selectItem}
        >
            <div className="flex flex-row justify-between items-center">
                <div className="flex flex-row items-center gap-3">
                    <CommandBadge badge={props.badge}/>
                    <div>
                        <h3 className="font-mono">{idElm}</h3>
                        {props.description &&
                            <p className="text-muted-foreground text-sm">{descElm}</p>
                        }
                    </div>
                </div>
            </div>
        </div>
    )
}

// const CommandFolder = (props: React.PropsWithChildren<{
//     title: string
// }>) => {
//     return (
        
//     )
// }

function CommandForm(props: {
    messageId: MessageEnvelope["messageBody"]["case"]
    onSubmit: (values: any, cd: CommandDetails<z.ZodObject>) => void
}) {
    switch (props.messageId) {
    case 'internalMessage':
        return (
            <CmdFormInternalMessage onSubmit={(values) => props.onSubmit(values, cmdInternalMessage)} />
        );
    }
}

const CommandPrompt = (props: {
    search: string
}) => {
    const _client = bStore.use.client();

    const [formMessage, setFormMessage] = useState<MessageEnvelope["messageBody"]["case"] | null>(null);

    const searchLow = props.search.toLowerCase();

    const onSubmitCommandForm = (values: any, cd: CommandDetails<z.ZodObject>) => {
        const message = cd.zodToMessage(values);

        const bytes = buildEnvelope("0", cd.messageEnvelopeId, message);

        if (!_client)
            return;
        
        _client.send(bytes).catch(e => {
            console.log(e);
        });
    }
    
    return (
        <div className="flex flex-col border-t p-4 bg-background absolute bottom-0 left-0 w-full gap-2">
            {commandDetails.map((cd, k) => {
                const filteredVals = cd.values.filter(c => 
                    c.id.toLowerCase().includes(searchLow) 
                    || c.description.toLowerCase().includes(searchLow)
                    || (
                        c.variants.filter(v => 
                            v.id.toLowerCase().includes(searchLow) || 
                            v.description.toLowerCase().includes(searchLow)
                        ).length > 0
                    )
                );

                return (
                    <div key={k}>
                    {filteredVals.length > 0 &&
                        <h2 className="font-medium text-muted-foreground text-sm pb-2">{cd.title}</h2>
                    }
                    {filteredVals.map((sc, i) => (
                        <div key={i} className="flex-col">
                        <CommandEntry
                            key={i}
                            {...sc}
                            id={sc.group + "::" + sc.id}
                            filterTerm={formMessage ? "" : searchLow}
                            selectItem={() => setFormMessage(fm => fm == sc.messageEnvelopeId ? null : sc.messageEnvelopeId)}
                        />
                        <div className="flex flex-row items-stretch gap-2 pt-2">
                            <div className="bg-blue-100 w-0.5 rounded-full mx-2"/>
                            <div className="flex flex-col w-full gap-2">
                            {sc.variants.filter(c => 
                                c.id.toLowerCase().includes(searchLow) 
                                || c.description.toLowerCase().includes(searchLow)
                            ).map((v, j) => (
                                <CommandEntry
                                    key={j}
                                    id={sc.group + "::" + sc.id + "::" + v.id}
                                    badge="sub"
                                    filterTerm={formMessage ? "" : searchLow}
                                    selectItem={() => setFormMessage(fm => fm == sc.messageEnvelopeId ? null : sc.messageEnvelopeId)}
                                    description={v.description}
                                />
                            ))}
                            </div>
                        </div>
                        </div>
                    ))}
                    </div>
                )
            })}
            
            {formMessage &&
                <div className="flex flex-row items-stretch gap-2">
                    <div className="bg-secondary w-0.5 rounded-full mx-2"/>
                    <div className="flex flex-col w-full gap-2 py-2">
                        {/* <CommandEditor
                            commandId={formMessage}
                        /> */}
                        <CommandForm messageId={formMessage} onSubmit={onSubmitCommandForm}/>
                    </div>
                </div>
            }
        </div>
    )
}

const ConsoleView = () => {
    const [expandSearch, setExpandSearch] = useState(false);
    const [search, setSearch] = useState("");

    return (
        <>
            <LogTable/>
            <div className="flex-1 bg-secondary/30 rounded-md p-2 rounded-b-none border border-b-0 relative">
                {expandSearch &&
                    <CommandPrompt
                        search={search}
                    />
                }
            </div>
            <div className="flex flex-row">
                <Input
                    className="flex-1 rounded-r-none rounded-tl-none border-r-0 z-10"
                    placeholder={`internal::message heading="hello" message="test"`}
                    onChange={(e) => {
                        const val = e.target.value;
                        if (val !== "") {
                            setExpandSearch(true);
                            setSearch(val);
                        } else {
                            setExpandSearch(false);
                        }
                    }}
                />
                <Button className="rounded-l-none rounded-tr-none border-l-0 z-10">
                    Send
                </Button>
            </div>
        </>
    );
}

export default function ChannelTest() {
    const _user = bStore.use.user();

    console.log(_user);

    return (
        <ResizablePanelGroup direction="horizontal" className="h-screen">
            <ResizablePanel defaultSize={30} minSize={20}>
                <div className="h-screen flex flex-col">
                    <div className="flex flex-row items-center p-3 px-4 gap-2 border-b group">
                        {/* <Image src={"/icon.svg"} alt="WashU Satellite" width={30} height={30}/> */}
                        <h1 className="font-bold cursor-pointer">Mission Dashboard</h1>
                        <ChevronDown className="w-4 hidden group-hover:block"/>
                    </div>
                    <div className="flex-1 overflow-scroll p-2">
                        <div className="flex flex-col gap-2 overflow-scroll">
                            {channelGroups.map((cg, i) => (
                                <ChannelMenu
                                    key={i}
                                    title={cg.group}
                                    icon={cg.icon}
                                    channels={cg.channels}
                                />
                            ))}
                        </div>
                    </div>
                    <div className="flex flex-row justify-between border-t p-4 flex-wrap gap-2">
                        <div className="flex flex-row gap-2 flex-wrap">
                            {_user &&
                                <Avatar className="w-16 h-16">
                                    <AvatarImage
                                        src={_user?.avatar}
                                        alt={`@${_user?.username}`}
                                    />
                                    <AvatarFallback>
                                        {_user?.username[0]}
                                    </AvatarFallback>
                                </Avatar>
                            }
                            <div>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <h3 className="font-semibold">Nate Hayman</h3>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        @{_user?.username}
                                    </TooltipContent>
                                </Tooltip>
                                <p className="text-xs text-muted-foreground">Software Engineering</p>
                                {false ? (
                                    <div className="flex flex-row items-center gap-1 hover:underline text-red-500">
                                        <TriangleAlert className="w-3"/>
                                        <a href="" className="font-mono text-[0.7rem] pt-[0.05rem] font-medium">UNLICENSED</a>
                                    </div>
                                ) : (
                                    <div className="flex flex-row items-center gap-1 hover:underline text-muted-foreground">
                                        <a href="" className="font-mono text-[0.7rem]">KF0TSQ</a>
                                        <Check className="w-3"/>
                                    </div>
                                )}
                            </div>
                        </div>
                        <Button
                            variant="secondary"
                            size="sm"
                            className="cursor-pointer"
                            onClick={async () => {
                                await authClient.signOut({
                                    fetchOptions: {
                                        onSuccess: () => redirect("/sign-in")
                                    }
                                })
                            }}
                        >
                            Sign out
                        </Button>
                    </div>
                </div>
            </ResizablePanel>
            <ResizableHandle />
            <ResizablePanel className="flex flex-col h-screen overflow-scroll justify-end p-4">
                <ConsoleView/>
            </ResizablePanel>
        </ResizablePanelGroup>
    );
}