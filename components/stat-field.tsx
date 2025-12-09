import { cn } from "@/lib/utils"

export function StatField(props: {
    title: string,
    value: string,
    units?: string,
    small?: boolean
}) {
    return (
        <div className={cn(
            "flex flex-col",
            {
                "text-lg" : !props.small
            }
        )}>
            <p className="uppercase text-xs text-foreground/80">{props.title}</p>
            {props.units ? (
                <p className="font-semibold">{props.value}<span className="text-base pl-1">{props.units}</span></p>
            ) : (
                <p className="font-semibold font-mono">{props.value}</p>
            )}
        </div>
    )
}