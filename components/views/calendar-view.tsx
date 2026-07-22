"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
    Sheet,
    SheetTrigger,
    SheetContent,
    SheetHeader,
    SheetFooter,
    SheetTitle,
    SheetDescription,
    SheetClose,
} from "@/components/ui/sheet"
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu"
import {
    ChevronLeft,
    ChevronRight,
    RadioTower,
    ArrowDownToLine,
    Rocket,
    Wrench,
    TriangleAlert,
    ClipboardList,
    Tag,
    Plus,
    Filter,
    Clock,
    Satellite,
    CalendarSync,
    Copy,
    Check,
    X,
} from "lucide-react"
import { useProject } from "@/components/project-context"

// Event taxonomy for the ground-station schedule. Each type carries the
// Tailwind tokens used to render its chips / dots so the calendar and the
// day-detail panel stay visually in sync.
type EventKind =
    | "pass"
    | "downlink"
    | "maneuver"
    | "maintenance"
    | "anomaly"
    | "planning"
    | "misc"

type EventMeta = {
    label: string
    icon: React.ReactNode
    // chip = filled pill inside a day cell, dot = legend / list marker
    chip: string
    dot: string
    text: string
}

const EVENT_META: Record<EventKind, EventMeta> = {
    pass: {
        label: "Pass",
        icon: <RadioTower className="w-3.5 h-3.5" />,
        chip: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
        dot: "bg-blue-500",
        text: "text-blue-600 dark:text-blue-400",
    },
    downlink: {
        label: "Downlink",
        icon: <ArrowDownToLine className="w-3.5 h-3.5" />,
        chip: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
        dot: "bg-emerald-500",
        text: "text-emerald-600 dark:text-emerald-400",
    },
    maneuver: {
        label: "Maneuver",
        icon: <Rocket className="w-3.5 h-3.5" />,
        chip: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
        dot: "bg-amber-500",
        text: "text-amber-600 dark:text-amber-400",
    },
    maintenance: {
        label: "Maintenance",
        icon: <Wrench className="w-3.5 h-3.5" />,
        chip: "bg-muted text-muted-foreground border-border",
        dot: "bg-muted-foreground",
        text: "text-muted-foreground",
    },
    anomaly: {
        label: "Anomaly",
        icon: <TriangleAlert className="w-3.5 h-3.5" />,
        chip: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30",
        dot: "bg-red-500",
        text: "text-red-600 dark:text-red-400",
    },
    planning: {
        label: "Planning",
        icon: <ClipboardList className="w-3.5 h-3.5" />,
        chip: "bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/30",
        dot: "bg-violet-500",
        text: "text-violet-600 dark:text-violet-400",
    },
    misc: {
        label: "Misc",
        icon: <Tag className="w-3.5 h-3.5" />,
        chip: "bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-400 border-fuchsia-500/30",
        dot: "bg-fuchsia-500",
        text: "text-fuchsia-600 dark:text-fuchsia-400",
    },
}

const EVENT_KINDS = Object.keys(EVENT_META) as EventKind[]

type MissionEvent = {
    id: string
    kind: EventKind
    title: string
    // minutes from local midnight — keeps sorting/formatting trivial
    start: number
    durationMin: number
    // absolute day this event falls on (midnight-normalized)
    date: Date
    station?: string
    detail?: string
}

// Seed rows use a day offset from "today" so the schedule is always populated
// around the current month; they're resolved to absolute dates on mount.
type SeedEvent = Omit<MissionEvent, "date"> & { dayOffset: number }

const SEED_EVENTS: SeedEvent[] = []

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
]

function startOfDay(d: Date) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function addDays(d: Date, n: number) {
    const r = startOfDay(d)
    r.setDate(r.getDate() + n)
    return r
}

function sameDay(a: Date, b: Date) {
    return (
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate()
    )
}

function formatTime(minutes: number) {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    const period = h >= 12 ? "PM" : "AM"
    const h12 = h % 12 === 0 ? 12 : h % 12
    return `${h12}:${String(m).padStart(2, "0")} ${period}`
}

// <input type="date"> value (YYYY-MM-DD) built from local fields so the date
// doesn't shift across timezones the way toISOString() would.
function toDateInputValue(d: Date) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function parseDateInput(value: string) {
    const [y, m, d] = value.split("-").map(Number)
    return new Date(y, m - 1, d)
}

// "HH:MM" (24h, from <input type="time">) → minutes from midnight.
function parseTimeToMinutes(value: string) {
    const [h, m] = value.split(":").map(Number)
    return h * 60 + m
}

type CalendarRow = {
    id: number
    kind: EventKind
    title: string
    startsAt: string
    durationMin: number
    station: string | null
    detail: string | null
}

function rowToEvent(row: CalendarRow): MissionEvent {
    const d = new Date(row.startsAt)
    return {
        id: String(row.id),
        kind: row.kind,
        title: row.title,
        start: d.getHours() * 60 + d.getMinutes(),
        durationMin: row.durationMin,
        date: startOfDay(d),
        station: row.station ?? undefined,
        detail: row.detail ?? undefined,
    }
}

// Index events by day (toDateString key) so day cells can look them up in
// O(1); each day's list is sorted by start time.
function useEventsByDate(events: MissionEvent[]) {
    return React.useMemo(() => {
        const map = new Map<string, MissionEvent[]>()
        for (const ev of events) {
            const key = ev.date.toDateString()
            const list = map.get(key) ?? []
            list.push(ev)
            map.set(key, list)
        }
        for (const list of map.values()) {
            list.sort((a, b) => a.start - b.start)
        }
        return map
    }, [events])
}

function LegendDot(props: { kind: EventKind; active: boolean; onToggle: () => void }) {
    const meta = EVENT_META[props.kind]
    return (
        <button
            onClick={props.onToggle}
            className={cn(
                "flex flex-row items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs transition-all cursor-pointer",
                props.active
                    ? "border-border text-foreground"
                    : "border-transparent text-muted-foreground/50 line-through"
            )}
        >
            <span className={cn("w-2 h-2 rounded-full", props.active ? meta.dot : "bg-muted-foreground/40")} />
            {meta.label}
        </button>
    )
}

function DayCell(props: {
    date: Date
    inMonth: boolean
    isToday: boolean
    isSelected: boolean
    events: MissionEvent[]
    onSelect: () => void
}) {
    const { events } = props
    const shown = events.slice(0, 3)
    const overflow = events.length - shown.length

    return (
        <button
            onClick={props.onSelect}
            className={cn(
                "group flex flex-col items-stretch text-left min-h-[6.5rem] p-1.5 border-b border-r transition-colors",
                props.inMonth ? "bg-background" : "bg-muted/30 text-muted-foreground/60",
                "hover:bg-secondary/60",
                props.isSelected && "ring-2 ring-inset ring-blue-500/60 bg-secondary/40"
            )}
        >
            <div className="flex flex-row items-center justify-between">
                <span
                    className={cn(
                        "flex items-center justify-center text-xs font-medium h-6 w-6 rounded-full",
                        props.isToday && "bg-red-700 text-white font-bold"
                    )}
                >
                    {props.date.getDate()}
                </span>
                {events.length > 0 && (
                    <span className="text-[0.65rem] font-mono text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                        {events.length}
                    </span>
                )}
            </div>
            <div className="flex flex-col gap-0.5 mt-1">
                {shown.map((ev) => {
                    const meta = EVENT_META[ev.kind]
                    return (
                        <div
                            key={ev.id}
                            className={cn(
                                "flex flex-row items-center gap-1 rounded-sm border px-1 py-0.5 text-[0.65rem] leading-tight truncate",
                                meta.chip
                            )}
                        >
                            <span className="font-mono shrink-0 opacity-80">{formatTime(ev.start)}</span>
                            <span className="truncate">{ev.title}</span>
                        </div>
                    )
                })}
                {overflow > 0 && (
                    <span className="text-[0.65rem] text-muted-foreground pl-1">+{overflow} more</span>
                )}
            </div>
        </button>
    )
}

function DayDetail(props: { date: Date; events: MissionEvent[] }) {
    const { date, events } = props

    return (
        <div className="flex flex-col h-full min-h-0">
            <div className="px-4 py-3 border-b">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    {WEEKDAYS[date.getDay()]}
                </p>
                <h3 className="font-semibold text-lg leading-tight">
                    {MONTHS[date.getMonth()]} {date.getDate()}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                    {events.length} scheduled {events.length === 1 ? "event" : "events"}
                </p>
            </div>
            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
                {events.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center gap-2 text-muted-foreground">
                        <Satellite className="w-8 h-8 opacity-40" />
                        <p className="text-sm">No events scheduled</p>
                    </div>
                ) : (
                    events.map((ev) => {
                        const meta = EVENT_META[ev.kind]
                        return (
                            <div
                                key={ev.id}
                                className="flex flex-row gap-3 rounded-md border p-3 bg-secondary/30 hover:bg-secondary/60 transition-colors"
                            >
                                <div className={cn("flex items-center justify-center h-8 w-8 rounded-md shrink-0", meta.chip)}>
                                    {meta.icon}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-row items-center justify-between gap-2">
                                        <p className="font-medium text-sm truncate">{ev.title}</p>
                                        {ev.station && (
                                            <Badge className="font-mono rounded-md bg-secondary text-muted-foreground text-[0.65rem] shrink-0">
                                                {ev.station}
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="flex flex-row items-center gap-1.5 text-xs text-muted-foreground mt-1">
                                        <Clock className="w-3 h-3" />
                                        <span className="font-mono">{formatTime(ev.start)}</span>
                                        <span>·</span>
                                        <span>{ev.durationMin} min</span>
                                        <span className={cn("ml-1 font-medium", meta.text)}>{meta.label}</span>
                                    </div>
                                    {ev.detail && (
                                        <p className="text-xs text-muted-foreground/90 mt-1.5">{ev.detail}</p>
                                    )}
                                </div>
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    )
}

function ScheduleSheet(props: {
    defaultDate: Date
    onCreate: (ev: MissionEvent) => void
}) {
    const [open, setOpen] = React.useState(false)
    const [kind, setKind] = React.useState<EventKind>("pass")
    const [title, setTitle] = React.useState("")
    const [date, setDate] = React.useState(() => toDateInputValue(props.defaultDate))
    const [time, setTime] = React.useState("09:00")
    const [duration, setDuration] = React.useState("10")
    const [station, setStation] = React.useState("")
    const [detail, setDetail] = React.useState("")
    const [error, setError] = React.useState<string | null>(null)

    // Sync the date field to whatever day is selected each time the sheet opens.
    React.useEffect(() => {
        if (open) setDate(toDateInputValue(props.defaultDate))
    }, [open, props.defaultDate])

    const reset = () => {
        setKind("pass")
        setTitle("")
        setTime("09:00")
        setDuration("10")
        setStation("")
        setDetail("")
        setError(null)
    }

    const submit = () => {
        if (!title.trim()) {
            setError("Give the event a title.")
            return
        }
        const dur = parseInt(duration, 10)
        if (!Number.isFinite(dur) || dur <= 0) {
            setError("Duration must be a positive number of minutes.")
            return
        }
        if (!date) {
            setError("Pick a date.")
            return
        }
        props.onCreate({
            id: `u-${Date.now()}`,
            kind,
            title: title.trim(),
            start: parseTimeToMinutes(time),
            durationMin: dur,
            date: parseDateInput(date),
            station: station.trim().toUpperCase() || undefined,
            detail: detail.trim() || undefined,
        })
        setOpen(false)
        reset()
    }

    return (
        <Sheet
            open={open}
            onOpenChange={(o) => {
                setOpen(o)
                if (!o) reset()
            }}
        >
            <SheetTrigger asChild>
                <Button variant="default" size="sm">
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">Schedule</span>
                </Button>
            </SheetTrigger>
            <SheetContent side="right" className="flex flex-col gap-0 p-0 w-full sm:max-w-md">
                <SheetHeader className="border-b">
                    <SheetTitle>Schedule event</SheetTitle>
                    <SheetDescription>Add an event to the mission calendar.</SheetDescription>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                        <Label>Type</Label>
                        <div className="grid grid-cols-2 gap-1.5">
                            {EVENT_KINDS.map((k) => {
                                const meta = EVENT_META[k]
                                const active = kind === k
                                return (
                                    <button
                                        key={k}
                                        type="button"
                                        onClick={() => setKind(k)}
                                        className={cn(
                                            "flex flex-row items-center gap-2 rounded-md border px-2.5 py-2 text-sm transition-colors cursor-pointer",
                                            active
                                                ? cn(meta.chip, "font-medium")
                                                : "border-border text-muted-foreground hover:bg-secondary/60"
                                        )}
                                    >
                                        {meta.icon}
                                        {meta.label}
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="event-title">Title</Label>
                        <Input
                            id="event-title"
                            placeholder="e.g. Pass #132 · WUSAT"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            autoFocus
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="event-date">Date</Label>
                            <Input
                                id="event-date"
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="event-time">Start</Label>
                            <Input
                                id="event-time"
                                type="time"
                                value={time}
                                onChange={(e) => setTime(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="event-duration">Duration (min)</Label>
                            <Input
                                id="event-duration"
                                type="number"
                                min={1}
                                value={duration}
                                onChange={(e) => setDuration(e.target.value)}
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="event-station">
                                Station <span className="text-muted-foreground font-normal">(optional)</span>
                            </Label>
                            <Input
                                id="event-station"
                                placeholder="WUSAT"
                                value={station}
                                onChange={(e) => setStation(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="event-detail">
                            Notes <span className="text-muted-foreground font-normal">(optional)</span>
                        </Label>
                        <Textarea
                            id="event-detail"
                            placeholder="Additional details…"
                            value={detail}
                            onChange={(e) => setDetail(e.target.value)}
                            rows={3}
                        />
                    </div>

                    {error && (
                        <p className="text-sm text-destructive flex flex-row items-center gap-1.5">
                            <TriangleAlert className="w-4 h-4" />
                            {error}
                        </p>
                    )}
                </div>

                <SheetFooter className="border-t flex-row justify-end gap-2">
                    <SheetClose asChild>
                        <Button variant="ghost">Cancel</Button>
                    </SheetClose>
                    <Button onClick={submit}>Schedule</Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    )
}

function SyncDialog(props: { projectId: string | null; open: boolean; onClose: () => void }) {
    const [url, setUrl] = React.useState("")
    const [copied, setCopied] = React.useState(false)

    React.useEffect(() => {
        if (!props.open || !props.projectId) return
        let alive = true
        fetch(`/api/projects/${props.projectId}/calendar/feed`)
            .then((r) => r.json())
            .then((d) => { if (alive && d?.url) setUrl(d.url) })
            .catch(() => {})
        return () => { alive = false }
    }, [props.open, props.projectId])

    if (!props.open) return null

    const webcal = url.replace(/^https?:\/\//, "webcal://")

    const copy = async () => {
        if (!url) return
        try {
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(url)
            } else {
                const ta = document.createElement("textarea")
                ta.value = url
                ta.style.position = "fixed"
                ta.style.opacity = "0"
                document.body.appendChild(ta)
                ta.select()
                document.execCommand("copy")
                document.body.removeChild(ta)
            }
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
        } catch {}
    }

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60" onClick={props.onClose} />
            <div className="relative z-10 w-full max-w-lg rounded-lg border bg-background p-5 flex flex-col gap-4">
                <div className="flex flex-row items-center justify-between">
                    <div className="flex flex-row items-center gap-2">
                        <CalendarSync className="w-4 h-4" />
                        <h3 className="font-semibold">Sync to your calendar</h3>
                    </div>
                    <button onClick={props.onClose} className="p-1 -m-1 rounded text-muted-foreground hover:text-foreground cursor-pointer">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <p className="text-sm text-muted-foreground">
                    Subscribe to the mission schedule from Google Calendar, Apple Calendar, or Outlook. New and updated events appear automatically — Google can take several hours to refresh a subscribed URL.
                </p>
                <div className="flex flex-col gap-1.5">
                    <Label className="text-xs uppercase tracking-wide text-muted-foreground">Feed URL</Label>
                    <div className="flex flex-row gap-2">
                        <Input readOnly value={url} placeholder="Loading…" onFocus={(e) => e.currentTarget.select()} className="font-mono text-xs" />
                        <Button variant="secondary" onClick={copy} disabled={!url}>
                            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            {copied ? "Copied" : "Copy"}
                        </Button>
                    </div>
                </div>
                <div className="rounded-md border bg-secondary/30 p-3 text-xs text-muted-foreground flex flex-col gap-1">
                    <p className="font-medium text-foreground">Google Calendar</p>
                    <p>Other calendars → <span className="font-medium">＋ → From URL</span> → paste the feed URL → Add calendar.</p>
                    <p className="font-medium text-foreground pt-1.5">Apple Calendar</p>
                    <p>
                        File → New Calendar Subscription → paste → Subscribe
                        {url && <> · <a href={webcal} className="underline text-blue-500">open with webcal</a></>}.
                    </p>
                </div>
            </div>
        </div>
    )
}

export default function CalendarView() {
    const today = React.useMemo(() => startOfDay(new Date()), [])
    const { activeId } = useProject()

    const [events, setEvents] = React.useState<MissionEvent[]>([])
    const [syncOpen, setSyncOpen] = React.useState(false)
    const eventsByDate = useEventsByDate(events)

    React.useEffect(() => {
        if (!activeId) { setEvents([]); return }
        let alive = true
        fetch(`/api/projects/${activeId}/calendar`)
            .then((r) => r.json())
            .then((rows: CalendarRow[]) => { if (alive && Array.isArray(rows)) setEvents(rows.map(rowToEvent)) })
            .catch(() => {})
        return () => { alive = false }
    }, [activeId])

    // Month the grid is currently displaying (first of month).
    const [cursor, setCursor] = React.useState(
        () => new Date(today.getFullYear(), today.getMonth(), 1)
    )
    const [selected, setSelected] = React.useState<Date>(today)
    const [filters, setFilters] = React.useState<Record<EventKind, boolean>>(
        () => Object.fromEntries(EVENT_KINDS.map((k) => [k, true])) as Record<EventKind, boolean>
    )

    const activeKinds = React.useCallback(
        (events: MissionEvent[]) => events.filter((e) => filters[e.kind]),
        [filters]
    )

    // Build the 6-week grid (leading/trailing days from adjacent months).
    const gridDays = React.useMemo(() => {
        const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
        const gridStart = addDays(first, -first.getDay())
        return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i))
    }, [cursor])

    const selectedEvents = activeKinds(eventsByDate.get(selected.toDateString()) ?? [])

    const goToday = () => {
        setCursor(new Date(today.getFullYear(), today.getMonth(), 1))
        setSelected(today)
    }
    const shiftMonth = (delta: number) =>
        setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1))

    const addEvent = async (ev: MissionEvent) => {
        if (!activeId) return
        const startsAt = new Date(
            ev.date.getFullYear(), ev.date.getMonth(), ev.date.getDate(),
            Math.floor(ev.start / 60), ev.start % 60
        ).toISOString()
        const res = await fetch(`/api/projects/${activeId}/calendar`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                kind: ev.kind,
                title: ev.title,
                startsAt,
                durationMin: ev.durationMin,
                station: ev.station ?? null,
                detail: ev.detail ?? null,
            }),
        })
        if (!res.ok) return
        const created = rowToEvent(await res.json())
        setEvents((prev) => [...prev, created])
        setCursor(new Date(created.date.getFullYear(), created.date.getMonth(), 1))
        setSelected(created.date)
        setFilters((f) => ({ ...f, [created.kind]: true }))
    }

    return (
        <div className="flex flex-col lg:flex-row gap-4 h-full min-h-0">
            {/* Calendar grid */}
            <div className="flex-1 flex flex-col min-h-0 min-w-0">
                {/* Toolbar */}
                <div className="flex flex-row items-center justify-between flex-wrap gap-3 pb-3">
                    <div className="flex flex-row items-center gap-2">
                        <h2 className="font-semibold text-lg tabular-nums">
                            {MONTHS[cursor.getMonth()]} {cursor.getFullYear()}
                        </h2>
                        <div className="flex flex-row items-center">
                            <Button variant="ghost" size="sm" onClick={() => shiftMonth(-1)}>
                                <ChevronLeft className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => shiftMonth(1)}>
                                <ChevronRight className="w-4 h-4" />
                            </Button>
                        </div>
                        <Button variant="outline" size="sm" onClick={goToday}>
                            Today
                        </Button>
                    </div>
                    <div className="flex flex-row items-center gap-2">
                        <div className="hidden md:flex flex-row items-center gap-1">
                            {EVENT_KINDS.map((k) => (
                                <LegendDot
                                    key={k}
                                    kind={k}
                                    active={filters[k]}
                                    onToggle={() => setFilters((f) => ({ ...f, [k]: !f[k] }))}
                                />
                            ))}
                        </div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="md:hidden">
                                    <Filter className="w-4 h-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Event Types</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {EVENT_KINDS.map((k) => (
                                    <DropdownMenuCheckboxItem
                                        key={k}
                                        checked={filters[k]}
                                        onCheckedChange={() =>
                                            setFilters((f) => ({ ...f, [k]: !f[k] }))
                                        }
                                    >
                                        {EVENT_META[k].label}
                                    </DropdownMenuCheckboxItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <Button variant="outline" size="sm" onClick={() => setSyncOpen(true)}>
                            <CalendarSync className="w-4 h-4" />
                            <span className="hidden sm:inline">Sync</span>
                        </Button>
                        <ScheduleSheet defaultDate={selected} onCreate={addEvent} />
                    </div>
                </div>

                {/* Grid */}
                <div className="flex flex-col flex-1 min-h-0 rounded-md border overflow-hidden">
                    <div className="grid grid-cols-7 border-b bg-secondary/40">
                        {WEEKDAYS.map((d) => (
                            <div
                                key={d}
                                className="px-2 py-1.5 text-xs font-medium text-muted-foreground text-center"
                            >
                                {d}
                            </div>
                        ))}
                    </div>
                    <div className="grid grid-cols-7 flex-1 min-h-0 overflow-y-auto [&>*:nth-child(7n)]:border-r-0">
                        {gridDays.map((date) => (
                            <DayCell
                                key={date.toDateString()}
                                date={date}
                                inMonth={date.getMonth() === cursor.getMonth()}
                                isToday={sameDay(date, today)}
                                isSelected={sameDay(date, selected)}
                                events={activeKinds(eventsByDate.get(date.toDateString()) ?? [])}
                                onSelect={() => setSelected(date)}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* Day detail panel */}
            <div className="lg:w-80 shrink-0 rounded-md border overflow-hidden bg-background flex flex-col min-h-0 max-h-full">
                <DayDetail date={selected} events={selectedEvents} />
            </div>

            <SyncDialog projectId={activeId} open={syncOpen} onClose={() => setSyncOpen(false)} />
        </div>
    )
}
