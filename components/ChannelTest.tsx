"use client";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "./ui/resizable";
import { Collapsible, CollapsibleTrigger } from "./ui/collapsible";
import { Button } from "./ui/button";
import { ChevronDown, ChevronRight, ChevronUp, EllipsisVertical, Hash, Satellite, Telescope } from "lucide-react";
import { CollapsibleContent } from "./ui/collapsible";
import { Checkbox } from "./ui/checkbox";
import { Label } from "./ui/label";
import React, { Dispatch, ReactNode, SetStateAction, useState } from "react";
import { Badge } from "./ui/badge";
import clsx from "clsx";
import { Input } from "./ui/input";
import Image from "next/image";
import { CheckedState } from "@radix-ui/react-checkbox";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "./ui/form";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Textarea } from "./ui/textarea";
import { bStore } from "@/hooks/useAppStore";
import { EstablishClientSchema, MessageEnvelopeSchema } from "@/gen/messages/transport/v1/transport_pb";
import { create, toBinary } from "@bufbuild/protobuf";
import { base64Encode } from "@bufbuild/protobuf/wire";
import { Subscription } from "centrifuge/build/protobuf";
import { buildEnvelope } from "@/lib/utils";
import { CommandBadgeType } from "@/types/ui";
import { channelGroups, commandDetails } from "@/constants/commands";

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

const formSchema = z.object({
  message: z.string().min(2, {
    message: "Username must be at least 2 characters.",
  }),
});

const CommandEditor = () => {
    const _client = bStore.use.client();
    const _subscriptions = bStore.use.subscriptions();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            message: "",
        },
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        console.log(values);

        const packet = create(EstablishClientSchema, {
            msg: values.message
        });
        const bytes = buildEnvelope("0", 'establishClient', packet);

        if (!_client)
            return;
        
        _client.send(bytes).catch(e => {
            console.log(e);
        })

        // _subscriptions.get("internal")?.publish(bytes).catch(e => {
        //     console.log(e);
        // });
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <FormField
                    control={form.control}
                    name="message"
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
            </Form>
    )
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

    return (
        <Collapsible
            open={isOpen}
            onOpenChange={setIsOpen}
            className={clsx(
                isOpen ? "bg-gray-50" : "hover:bg-gray-100",
                "rounded-lg"
            )}
        >
            <CollapsibleTrigger asChild>
                <div className="flex flex-row justify-between items-center px-2 w-full group relative">
                    <div className="flex flex-row gap-2 overflow-hidden text-gray-700 p-2">
                        <div className="flex-1">
                            {props.icon}
                        </div>
                        <p className="flex-1 shrink-0 whitespace-nowrap font-medium text-sm pt-px">{props.title} Channels</p>
                        {values.filter(v => v.isChecked).map((v, i) => (
                            <Badge key={i} className={clsx(
                                v.value.toLowerCase().includes("error") 
                                    ? "bg-red-100 border-red-500 text-red-600"
                                    : v.value.toLowerCase().includes("warning")
                                        ? "bg-amber-100 border-amber-500 text-amber-600"
                                        : "bg-blue-100 border-blue-500 text-black"
                            )}>
                                {v.value.toLowerCase()}
                            </Badge>
                        ))}
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
            </CollapsibleTrigger>
            <CollapsibleContent>
                {values.map((v, i) => (
                    <ChannelSelection
                        key={i}
                        val={v.value}
                        checked={v.isChecked}
                        onCheckedChange={(checked) => {
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
                <div className="border border-blue-500 bg-blue-200 p-0.5 px-1 rounded-md">
                    <ChevronUp className="w-5"/>
                </div>
            );
        case 'sub':
            return (
                <div className="border border-blue-500 bg-blue-200 p-0.5 px-1.5 rounded-md">
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
                <span className="font-extrabold">{props.id.slice(index, index + props.filterTerm.length)}</span>
                <span>{props.id.slice(index + props.filterTerm.length)}</span>
                </>
            );
        }
        if (props.description?.toLowerCase().includes(props.filterTerm)) {
            const index = props.description.toLowerCase().indexOf(props.filterTerm);
            descElm = (
                <>
                <span>{props.description.slice(0, index)}</span>
                <span className="font-extrabold">{props.description.slice(index, index + props.filterTerm.length)}</span>
                <span>{props.description.slice(index + props.filterTerm.length)}</span>
                </>
            );
        }
    }

    return (
        <div
            tabIndex={0}
            className="bg-blue-100 text-blue-600 hover:bg-blue-200 hover:cursor-pointer p-4 rounded-lg tabindex"
            onClick={props.selectItem}
        >
            <div className="flex flex-row justify-between items-center">
                <div className="flex flex-row items-center gap-3">
                    <CommandBadge badge={props.badge}/>
                    <div>
                        <h3 className="font-mono">{idElm}</h3>
                        {props.description &&
                            <p className="text-gray-600 text-sm">{descElm}</p>
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

const CommandPrompt = (props: {
    search: string
}) => {
    const [expandForm, setExpandForm] = useState(false);

    const searchLow = props.search.toLowerCase();
    
    return (
        <div className="flex flex-col border-t p-4 bg-white absolute bottom-0 left-0 w-full gap-2">
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
                        <h2 className="font-medium text-gray-700 text-sm">{cd.title}</h2>
                    }
                    {filteredVals.map((sc, i) => (
                        <div key={i} className="flex-col">
                        <CommandEntry
                            key={i}
                            {...sc}
                            filterTerm={expandForm ? "" : searchLow}
                            selectItem={() => setExpandForm(ef => !ef)}
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
                                    id={sc.id + "::" + v.id}
                                    badge="sub"
                                    filterTerm={expandForm ? "" : searchLow}
                                    selectItem={() => setExpandForm(ef => !ef)}
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
            
            {expandForm &&
                <div className="flex flex-row items-stretch gap-2">
                    <div className="bg-gray-300 w-0.5 rounded-full mx-2"/>
                    <div className="flex flex-col w-full gap-2 py-2">
                        <CommandEditor/>
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
            <div className="flex-1 bg-gray-50 rounded-md mx-2 p-4 rounded-b-none border border-b-0 relative">
                {expandSearch &&
                    <CommandPrompt
                        search={search}
                    />
                }
            </div>
            <div className="flex flex-row px-2">
                <Input
                    className="flex-1 rounded-r-none rounded-tl-none border-r-0 z-10"
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
    return (
        <ResizablePanelGroup direction="horizontal" className="h-screen">
            <ResizablePanel defaultSize={30} minSize={20}>
                <div className="h-screen">
                    <div className="flex flex-row items-center p-2 mb-2 gap-4 border-blue-600 border-l-4">
                        {/* <Image src={"/icon.svg"} alt="WashU Satellite" width={30} height={30}/> */}
                        <h1 className="font-medium text-base px-2">Mission Dashboard</h1>
                    </div>
                    <div className="flex flex-col gap-2 px-2">
                        {channelGroups.map((cg, i) => (
                            <ChannelMenu
                                key={i}
                                title={cg.title}
                                icon={cg.icon}
                                channels={cg.channels}
                            />
                        ))}
                    </div>
                </div>
            </ResizablePanel>
            <ResizableHandle/>
            <ResizablePanel className="flex flex-col h-screen overflow-scroll justify-end p-4">
                <ConsoleView/>
            </ResizablePanel>
        </ResizablePanelGroup>
    );
}