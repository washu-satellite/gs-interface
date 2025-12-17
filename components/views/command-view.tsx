"use client";
import { Button } from "../ui/button";
import { ChevronUp, Hash } from "lucide-react";
import { ReactNode, useState } from "react";
import { Input } from "../ui/input";
import { z } from "zod";
import { bStore } from "@/hooks/useAppStore";
import { MessageEnvelope } from "@/gen/messages/transport/v1/transport_pb";
import { buildEnvelope } from "@/lib/utils";
import { CommandBadgeType } from "@/types/ui";
import { CmdFormInternalMessage, cmdInternalMessage, CommandDetails, commandDetails } from "@/constants/commands";


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

export default function CommandView() {
    const [expandSearch, setExpandSearch] = useState(false);
    const [search, setSearch] = useState("");

    return (
        <div className="flex flex-col h-full">
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
        </div>
    );
}