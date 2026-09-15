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
import { CmdFormInternalMessage, cmdInternalMessage, CmdFormPointing, cmdPointing, CmdFormSafeModeExit, cmdSafeModeExit, CommandDetails, commandDetails, allCommands } from "@/constants/commands";
import { useSettings } from "@/lib/settings";


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
    highlighted?: boolean,
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
            className={`bg-blue-100 text-blue-600 hover:bg-blue-200 dark:bg-blue-950 dark:hover:bg-blue-900 dark:text-blue-100 hover:cursor-pointer p-4 rounded-lg tabindex ${props.highlighted ? "ring-2 ring-blue-500" : ""}`}
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
    case 'pointingCmd':
        return (
            <CmdFormPointing onSubmit={(values) => props.onSubmit(values, cmdPointing)} />
        );
    case 'safeModeExitCmd':
        return (
            <CmdFormSafeModeExit onSubmit={(values) => props.onSubmit(values, cmdSafeModeExit)} />
        );
    }
}

const CommandPrompt = (props: {
    search: string,
    formMessage: MessageEnvelope["messageBody"]["case"] | null,
    setFormMessage: (fm: MessageEnvelope["messageBody"]["case"] | null) => void,
    highlightedId?: MessageEnvelope["messageBody"]["case"] | null
}) => {
    const _client = bStore.use.client();
    const [settings] = useSettings();

    const formMessage = props.formMessage;
    const setFormMessage = props.setFormMessage;
    const [pending, setPending] = useState<{ values: any; cd: CommandDetails<z.ZodObject> } | null>(null);

    const searchLow = props.search.toLowerCase();

    const doSend = (values: any, cd: CommandDetails<z.ZodObject>) => {
        const message = cd.zodToMessage(values);

        const bytes = buildEnvelope("0", cd.messageEnvelopeId, message);

        if (!_client)
            return;

        _client.send(bytes).catch(e => {
            console.log(e);
        });
    }

    const onSubmitCommandForm = (values: any, cd: CommandDetails<z.ZodObject>) => {
        if (settings.confirmCommands) {
            setPending({ values, cd });
            return;
        }
        doSend(values, cd);
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
                            highlighted={props.highlightedId === sc.messageEnvelopeId}
                            selectItem={() => setFormMessage(formMessage === sc.messageEnvelopeId ? null : sc.messageEnvelopeId)}
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
                                    selectItem={() => setFormMessage(formMessage === sc.messageEnvelopeId ? null : sc.messageEnvelopeId)}
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

            {pending && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60" onClick={() => setPending(null)} />
                    <div className="relative z-10 w-full max-w-sm rounded-lg border bg-background p-5 flex flex-col gap-4">
                        <h3 className="font-semibold">Confirm command</h3>
                        <p className="text-sm text-muted-foreground">Send this command to the spacecraft? This uplinks to the vehicle.</p>
                        <div className="flex flex-row justify-end gap-2">
                            <Button variant="ghost" onClick={() => setPending(null)}>Cancel</Button>
                            <Button onClick={() => { doSend(pending.values, pending.cd); setPending(null); }}>Send command</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default function CommandView() {
    const [expandSearch, setExpandSearch] = useState(false);
    const [search, setSearch] = useState("");
    const [formMessage, setFormMessage] = useState<MessageEnvelope["messageBody"]["case"] | null>(null);
    const [highlightIndex, setHighlightIndex] = useState(0);

    const searchLow = search.toLowerCase();
    const flatMatches = allCommands.filter(c =>
        c.id.toLowerCase().includes(searchLow)
        || c.description.toLowerCase().includes(searchLow)
        || c.variants.some(v =>
            v.id.toLowerCase().includes(searchLow) || v.description.toLowerCase().includes(searchLow)
        )
    );

    const onSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!expandSearch || flatMatches.length === 0) return;
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlightIndex(i => Math.min(i + 1, flatMatches.length - 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlightIndex(i => Math.max(i - 1, 0));
        } else if (e.key === "Enter") {
            e.preventDefault();
            const cmd = flatMatches[highlightIndex];
            if (cmd) setFormMessage(formMessage === cmd.messageEnvelopeId ? null : cmd.messageEnvelopeId);
        } else if (e.key === "Escape") {
            setExpandSearch(false);
        }
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 bg-secondary/30 rounded-md p-2 rounded-b-none border border-b-0 relative">
                {expandSearch &&
                    <CommandPrompt
                        search={search}
                        formMessage={formMessage}
                        setFormMessage={setFormMessage}
                        highlightedId={flatMatches[highlightIndex]?.messageEnvelopeId}
                    />
                }
            </div>
            <div className="flex flex-row">
                <Input
                    className="flex-1 rounded-r-none rounded-tl-none border-r-0 z-10"
                    placeholder={`internal::message heading="hello" message="test"`}
                    value={search}
                    onKeyDown={onSearchKeyDown}
                    onChange={(e) => {
                        const val = e.target.value;
                        setHighlightIndex(0);
                        if (val !== "") {
                            setExpandSearch(true);
                            setSearch(val);
                        } else {
                            setExpandSearch(false);
                            setSearch(val);
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