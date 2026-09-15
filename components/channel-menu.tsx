import { bStore } from "@/hooks/useAppStore";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@radix-ui/react-collapsible";
import clsx from "clsx";
import { EllipsisVertical } from "lucide-react";
import { ReactNode, useState } from "react";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import { Label } from "./ui/label";
import { CheckedState } from "@radix-ui/react-checkbox";
import { Badge } from "./ui/badge";

export function ChannelBadge(props: {
    value: string
}) {
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

function ChannelSelection(props: {
    val: string,
    checked: boolean,
    onCheckedChange(checked: CheckedState): void
}) {
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

export default function ChannelMenu(props: {
    title: string,
    icon: ReactNode,
    channels: string[]
}) {
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
                    <div className="flex flex-row gap-2 overflow-hidden p-2">
                        <div className="flex-1 text-muted-foreground">
                            {props.icon}
                        </div>
                        <p className="flex-1 shrink-0 whitespace-nowrap font-medium text-sm text-foreground pt-px">{props.title} Channels</p>
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
};