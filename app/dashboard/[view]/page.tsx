"use client";
import { Button } from "@/components/ui/button";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import CommandView from "@/components/views/command-view";
import { channelGroups } from "@/constants/commands";
import { bStore } from "@/hooks/useAppStore";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel, DropdownMenuCheckboxItem } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { ArrowUp, Bell, CalendarDays, Check, ChevronDown, Command, Cross, Database, ExternalLink, GamepadDirectional, LogOut, Moon, PanelRightClose, PanelRightOpen, PanelTopClose, Plus, Pyramid, RadioTower, RefreshCcw, Satellite, Settings, SidebarClose, SidebarOpen, SquareTerminal, Sun, Triangle, TriangleAlert, User, X } from "lucide-react";
import { redirect, useRouter } from "next/navigation";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import ControlsView from "@/components/views/controls-view";
import { Spinner } from "@/components/ui/spinner";
import { StatField } from "@/components/stat-field";
import CDHView from "@/components/views/cdh-view";
import DataView from "@/components/views/data-view";
import ScalarTelemetryView from "@/components/views/scalar-telemetry-view";
import CalendarView from "@/components/views/calendar-view";
import { SidebarContent, SidebarFooter, SidebarGroup, SidebarHeader, SidebarProvider } from "@/components/ui/sidebar";
import { ProjectProvider, useProject } from "@/components/project-context";
import { CustomDashboardView, MopsEditor } from "@/components/views/custom-dashboard-view";
import { ChevronUp, MoreVertical, Pencil, Trash2 } from "lucide-react";

type NavTileType = {
    icon: ReactNode,
    title: string,
    description?: string
    id: string
};

// REMOVE THIS
const navElms: NavTileType[] = [
    {
        icon: <Database className="w-4"/>,
        title: "Data",
        description: "Mission data from all channels",
        id: "data"
    },
    {
        icon: <Pyramid className="w-4"/>,
        title: "ADCS",
        description: "Model-based controls dashboard",
        id: "adcs"
    },
    {
        icon: <SquareTerminal className="w-4"/>,
        title: "Command",
        id: "command"
    },
    {
        icon: <RadioTower className="w-4"/>,
        title: "CDH",
        id: "cdh"
    },
    {
        icon: <Satellite className="w-4"/>,
        title: "SCALAR",
        description: "SCALAR telemetry and events via F' GDS",
        id: "scalar"
    },
    {
        icon: <CalendarDays className="w-4"/>,
        title: "Calendar",
        description: "Orbital passes and scheduled mission events",
        id: "calendar"
    }
];

function NavTile(props: NavTileType & { selected?: boolean, onClick: () => void, minimized?: boolean }) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <button
                    className={cn(
                        "flex flex-col items-center justify-between rounded-sm cursor-pointer hover:bg-secondary text-primary/80 hover:text-primary transition-all duration-300",
                        {
                            "bg-secondary text-foreground": props.selected,
                            "w-10 p-1.5": props.minimized,
                            "w-16 p-2": !props.minimized
                        }
                    )}
                    onClick={props.onClick}
                >
                    {props.icon}
                    <p
                        className={cn(
                            "text-xs overflow-hidden text-nowrap",
                            {
                                "w-0 h-0": props.minimized,
                                "w-full mt-1": !props.minimized
                            }
                        )}
                    >{props.title}</p>
                </button>
            </TooltipTrigger>
            {props.description &&
                <TooltipContent side="right">
                    {props.description}
                </TooltipContent>
            }
        </Tooltip>
    )
}

function UserTile() {
    const _user = bStore.use.user();

    return (
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
                    {true ? (
                        <div className="flex flex-row items-center gap-1 hover:underline text-amber-500">
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
    );
}

function UserTileMinimal() {
    const { data: session } = authClient.useSession();
    const router = useRouter();
    const user = session?.user;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="w-8 h-8 p-0 relative">
                    <Avatar className="w-8 h-8 rounded-md">
                        <AvatarImage src={user?.image ?? undefined} alt={user?.name ?? "user"} />
                        <AvatarFallback>{(user?.name ?? "U")[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
                {user && (
                    <>
                        <DropdownMenuLabel className="flex flex-col gap-0.5">
                            <span>{user.name}</span>
                            <span className="text-xs font-normal text-muted-foreground truncate">{user.email}</span>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                    </>
                )}
                <DropdownMenuItem onClick={() => router.push("/profile")}>
                    <User className="w-4 h-4" /> Profile
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={async () => {
                        await authClient.signOut();
                        router.push("/sign-in");
                    }}
                >
                    <LogOut className="w-4 h-4" /> Logout
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

function ViewHeader(props: {
    title: string
}) {
    return (
        <div className="sticky top-0 z-10 bg-background/60 backdrop-blur-sm flex flex-row items-center justify-between px-4 py-2 border-b">
            <h2 className="font-semibold text-base">{props.title}</h2>
            <div className="flex flex-row items-center">
                <Button variant="ghost">
                    <PanelTopClose className="w-4 h-4" />
                </Button>
                <Button variant="ghost">
                    <ExternalLink className="w-4 h-4" />
                </Button>
                <Button variant="ghost">
                    <Settings className="w-4 h-4" />
                </Button>
            </div>
        </div>
    )
}

function SingleViewWrapper(props: React.PropsWithChildren<{}>) {
    return (
        <ResizablePanelGroup
            direction="vertical"
        >
            <ResizablePanel
                defaultSize={100}
                style={{ overflow: "scroll" }}
            >
                {props.children}
            </ResizablePanel>
        </ResizablePanelGroup>
    );
}

function ViewContent(props: {
    view: string,
    setView: (v: string) => void
}) {
    const { views, deleteView, activeProject } = useProject();

    if (props.view.startsWith("custom-")) {
        const id = Number(props.view.slice("custom-".length));
        const cv = views.find((v) => v.id === id);
        if (!cv) return <h1 className="text-center pt-8 text-muted-foreground">View not found</h1>;
        return (
            <SingleViewWrapper>
                <CustomDashboardView
                    view={cv}
                    live={!!activeProject?.config?.live}
                    onDelete={() => {
                        deleteView(cv.id);
                        props.setView("adcs");
                    }}
                />
            </SingleViewWrapper>
        );
    }

    switch (props.view) {
        case "command":
            return (
                <SingleViewWrapper>
                    <div className="h-full flex flex-col">
                        <ViewHeader title="Command and Control"/>
                        <div className="flex-1 p-4">
                            <CommandView />
                        </div>
                    </div>
                </SingleViewWrapper>
            );
        case "adcs":
            return (
                <SingleViewWrapper>
                    <div className="flex w-full h-full">
                        <ControlsView />
                    </div>
                </SingleViewWrapper>
            );
        case "cdh":
            return (
                <ResizablePanelGroup
                    direction="horizontal"
                >
                    <ResizablePanel
                        defaultSize={50}
                        style={{ overflow: "scroll" }}
                    >
                        <ViewHeader title="Data View"/>
                        <div className="p-4 h-full pt-2">
                            <DataView />
                        </div>
                    </ResizablePanel>
                    <ResizableHandle
                        className="hover:bg-blue-500"
                    />
                    <ResizablePanel
                        defaultSize={50}
                        style={{ overflow: "scroll" }}
                    >
                        <ViewHeader title="Command View"/>
                        <div className="p-4 h-full pt-2">
                            <CommandView />
                        </div>
                    </ResizablePanel>
                </ResizablePanelGroup>
            );
        case "data":
            return (
                <div className="relative h-full">
                    <ViewHeader title="Data View"/>
                    <div className="flex-1 flex flex-col p-4">
                        <DataView />
                    </div>
                </div>
            );
        case "scalar":
            return (
                <SingleViewWrapper>
                    <div className="h-full flex flex-col">
                        <ViewHeader title="SCALAR Telemetry"/>
                        <div className="flex-1 p-4 min-h-0">
                            <ScalarTelemetryView />
                        </div>
                    </div>
                </SingleViewWrapper>
            );
        case "calendar":
            return (
                <SingleViewWrapper>
                    <div className="h-full flex flex-col">
                        <ViewHeader title="Mission Calendar"/>
                        <div className="flex-1 p-4 min-h-0">
                            <CalendarView />
                        </div>
                    </div>
                </SingleViewWrapper>
            );
        default:
            return <h1 className="text-center">Unknown view</h1>;
    }
}

function ModeTrigger({ live }: { live: boolean }) {
    const [session, setSession] = useState("LIVE");

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                {live ? (
                    <div className="relative flex flex-row items-center gap-1 text-white rounded-sm bg-red-700 px-2 cursor-pointer">
                        <div className="relative">
                            <span className="absolute w-3 h-3 bg-white opacity-30 rounded-full -mt-0.5 -ml-0.5 animate-ping"/>
                            <div className="w-2 h-2 bg-white rounded-full"/>
                        </div>

                        <p className="font-bold font-mono text-sm">LIVE</p>
                    </div>
                ) : (
                    <div className="relative flex flex-row items-center gap-1 rounded-md bg-muted px-2 py-1 cursor-pointer">
                        <div className="w-2 h-2 rounded-full bg-muted-foreground/60"/>
                        <p className="font-bold font-mono text-sm text-muted-foreground">OFFLINE</p>
                    </div>
                )}
            </DropdownMenuTrigger>
            <DropdownMenuContent>
                <DropdownMenuGroup>
                    <DropdownMenuLabel>
                        Data Mode
                    </DropdownMenuLabel>
                    <DropdownMenuCheckboxItem 
                        checked={session === "LIVE"}
                        onCheckedChange={() => setSession("LIVE")}
                    >
                        Live Stream
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                        checked={session === "Playback"}
                        onCheckedChange={() => setSession("Playback")}
                    >
                        Recordings
                    </DropdownMenuCheckboxItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                    <DropdownMenuLabel>
                        Orbital Passes
                    </DropdownMenuLabel>
                    <DropdownMenuCheckboxItem>
                        Pass #123
                        <span className="bg-muted rounded-md px-2 py-1 -my-1">10/23/25</span>
                        12:23:12 CST
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem>
                        Pass #122
                        <span className="bg-muted rounded-md px-2 py-1 -my-1">10/23/25</span>
                        12:23:12 CST
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem>
                        Pass #121
                        <span className="bg-muted rounded-md px-2 py-1 -my-1">10/23/25</span>
                        12:23:12 CST
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem>
                        Pass #120
                        <span className="bg-muted rounded-md px-2 py-1 -my-1">10/23/25</span>
                        12:23:12 CST
                    </DropdownMenuCheckboxItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                    <DropdownMenuItem>
                        See all
                    </DropdownMenuItem>
                </DropdownMenuGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

function Heading() {
    const _setTheme = bStore.use.setTheme();
    const _theme = bStore.use.theme();
    const { projects, activeProject, setActiveId, notifications, markNotificationRead } = useProject();
    const live = !!activeProject?.config?.live;

    return (
        <div className="sticky top-0 z-50">
            <div className="flex flex-row items-center justify-between text-nowrap gap-10 pr-4">
                <div className="flex flex-row items-center">
                    {/* <a href="https://www.washusatellite.com" className="shrink-0">
                        <img src={"/logo.svg"} alt="" className="h-12 p-2 pb-3"/>
                    </a> */}
                    {/* <div className="w-[0.1rem] h-5 rotate-12 bg-input ml-2 mr-3 rounded-full shrink-0"/> */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <div className="flex flex-row items-center p-3 gap-2 group cursor-pointer">
                                {/* <Image src={"/icon.svg"} alt="WashU Satellite" width={30} height={30}/> */}
                                <h1 className="font-bold">{activeProject?.name ?? "Mission"}</h1>
                                <ChevronDown className="w-4"/>
                            </div>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuGroup>
                                {projects.map((p) => (
                                    <DropdownMenuItem key={p.id} onClick={() => setActiveId(p.id)}>
                                        <span className="flex-1">{p.name}</span>
                                        {p.id === activeProject?.id && <Check className="w-4" />}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuGroup>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <ModeTrigger live={live} />
                </div>
                <div className="flex-row items-end gap-10 py-2 text-foreground/90 hidden lg:flex">
                    <StatField title="Next Pass" value={live ? "T-00:54:02" : "--"}/>
                    <StatField title="Health Status" value={live ? "NOMINAL" : "--"}/>
                    <StatField title="Current Mode" value={live ? "STANDBY" : "--"}/>
                    <StatField title="Link SNR" value={live ? "10.24" : "--"} units={live ? "dB" : undefined}/>
                    <StatField title="Altitude" value={live ? "551.35" : "--"} units={live ? "km" : undefined}/>
                </div>
                {/* <div className="flex flex-row items-center">
                    <div className="flex flex-row items-center justify-between gap-1 border-amber-500 border-[0.06rem] rounded-xl px-2 py-1 text-amber-500">
                            <div className="flex flex-row items-center gap-1">
                                <TriangleAlert className="shrink-0 w-4"/>
                                <p className="text-wrap line-clamp-1 text-xs">Your account does not have an associated FCC license. You will be unable to author any commands until you have been properly verified as a licensed operator</p>
                            </div>
                            <div className="flex flex-row items-center gap-1">
                                <p className="font-bold text-sm">+10</p>
                                <ChevronDown className="w-4"/>
                            </div>
                    </div>
                </div> */}
                <div className="flex flex-row items-center">
                    <Button
                        variant="ghost"
                        onClick={() => {
                            _setTheme(_theme === 'light' ? 'dark' : 'light');
                        }}
                    >
                        {_theme === 'light' ? (
                            <Moon />
                        ) : (
                            <Sun />
                        )}
                    </Button>
                    <Button variant="ghost">
                        <Settings />
                    </Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="relative">
                                <Bell />
                                {notifications.length > 0 && (
                                    <span className="absolute top-0 right-0 px-1 min-w-4 rounded-full bg-red-500 border-input font-semibold text-[11px] text-white">
                                        {notifications.length}
                                    </span>
                                )}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-80">
                            <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {notifications.length === 0 ? (
                                <p className="p-4 px-8 text-center text-sm text-muted-foreground">You have no new notifications</p>
                            ) : (
                                <div className="max-h-80 overflow-y-auto">
                                    {notifications.map((n) => (
                                        <div key={n.id} className="flex flex-row items-start gap-2 px-2 py-1.5 rounded-sm hover:bg-secondary/50">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex flex-row items-center gap-2">
                                                    <span className={cn(
                                                        "w-2 h-2 rounded-full shrink-0",
                                                        n.level === "critical" ? "bg-red-500" : n.level === "warning" ? "bg-amber-500" : "bg-blue-500"
                                                    )}/>
                                                    <p className="font-medium text-sm truncate">{n.title}</p>
                                                </div>
                                                {n.message && <p className="text-xs text-muted-foreground pl-4 text-wrap">{n.message}</p>}
                                            </div>
                                            <button
                                                onClick={() => markNotificationRead(n.id)}
                                                aria-label="Mark as read"
                                                className="shrink-0 p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <div className="w-px h-6 bg-border mx-6"/>
                    <UserTileMinimal />
                </div>
            </div>  
            {/* <div className="rounded-tl-md border-t border-l h-2" /> */}
        </div>
    );
}

type NavItem = { key: string; title: string; icon: ReactNode; custom: boolean; viewId?: number };

function NavRow(props: {
    item: NavItem,
    index: number,
    total: number,
    view: string,
    minimized: boolean,
    dragging: boolean,
    over: boolean,
    onSelect: () => void,
    onDragStart: () => void,
    onDragOver: (e: React.DragEvent) => void,
    onDrop: () => void,
    onDragEnd: () => void,
    onMove: (dir: -1 | 1) => void,
    onRename: () => void,
    onDelete: () => void,
}) {
    const it = props.item;
    return (
        <div
            draggable
            onDragStart={props.onDragStart}
            onDragOver={props.onDragOver}
            onDrop={props.onDrop}
            onDragEnd={props.onDragEnd}
            className={cn(
                "group relative",
                props.dragging && "opacity-40",
                props.over && "ring-2 ring-blue-500/60 rounded-sm"
            )}
        >
            <NavTile
                id={it.key}
                title={it.title}
                icon={it.icon}
                selected={props.view === it.key}
                onClick={props.onSelect}
                minimized={props.minimized}
            />
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button
                        onClick={(e) => e.stopPropagation()}
                        className="absolute top-1 -right-1 p-0.5 rounded opacity-40 group-hover:opacity-100 text-muted-foreground hover:text-foreground hover:bg-secondary transition-opacity cursor-pointer"
                    >
                        <MoreVertical className="w-3.5 h-3.5" />
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="right" align="start">
                    <DropdownMenuItem disabled={props.index === 0} onClick={() => props.onMove(-1)}>
                        <ChevronUp className="w-4 h-4" /> Move up
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled={props.index === props.total - 1} onClick={() => props.onMove(1)}>
                        <ChevronDown className="w-4 h-4" /> Move down
                    </DropdownMenuItem>
                    {it.custom && (
                        <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={props.onRename}>
                                <Pencil className="w-4 h-4" /> Rename
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-500" onClick={props.onDelete}>
                                <Trash2 className="w-4 h-4" /> Delete
                            </DropdownMenuItem>
                        </>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}

function Sidebar(props: {
    view: string,
    setView: (v: string) => void
}) {
    const [open, setOpen] = useState(true);
    const [building, setBuilding] = useState(false);
    const { views, activeId, createView, reorderViews, renameView, deleteView } = useProject();

    const [order, setOrder] = useState<string[]>([]);
    const [dragIdx, setDragIdx] = useState<number | null>(null);
    const [overIdx, setOverIdx] = useState<number | null>(null);
    const [renaming, setRenaming] = useState<{ id: number; name: string } | null>(null);

    const items: NavItem[] = useMemo(() => [
        ...navElms
            .filter((n) => n.id !== "scalar" || activeId === "scalar")
            .map((n) => ({ key: n.id, title: n.title, icon: n.icon, custom: false })),
        ...views.map((v) => ({ key: `custom-${v.id}`, title: v.name, icon: <GamepadDirectional className="w-4" />, custom: true, viewId: v.id })),
    ], [views, activeId]);

    useEffect(() => {
        const ids = items.map((i) => i.key);
        let saved: string[] = [];
        try { saved = JSON.parse(localStorage.getItem(`nav-order-${activeId}`) || "[]"); } catch {}
        setOrder([...saved.filter((k) => ids.includes(k)), ...ids.filter((k) => !saved.includes(k))]);
    }, [activeId, items]);

    const persist = (next: string[]) => {
        setOrder(next);
        try { localStorage.setItem(`nav-order-${activeId}`, JSON.stringify(next)); } catch {}
        const customIds = next.filter((k) => k.startsWith("custom-")).map((k) => Number(k.slice(7)));
        if (customIds.length) reorderViews(customIds);
    };

    const move = (index: number, dir: -1 | 1) => {
        const to = index + dir;
        if (to < 0 || to >= order.length) return;
        const next = [...order];
        [next[index], next[to]] = [next[to], next[index]];
        persist(next);
    };

    const onDrop = () => {
        if (dragIdx !== null && overIdx !== null && dragIdx !== overIdx) {
            const next = [...order];
            const [moved] = next.splice(dragIdx, 1);
            next.splice(overIdx, 0, moved);
            persist(next);
        }
        setDragIdx(null);
        setOverIdx(null);
    };

    const ordered = order.map((k) => items.find((i) => i.key === k)).filter(Boolean) as NavItem[];

    return (
        <div className="flex flex-col justify-between items-center">
            <div className="flex flex-col items-center p-3 py-3 gap-4">
                <Button
                    variant="ghost"
                    className="-mb-1 text-secondary-foreground/80"
                    onClick={() => setOpen(o => !o)}
                >
                    {open ? <SidebarClose /> : <SidebarOpen />}
                </Button>
                {ordered.map((it, i) => (
                    <NavRow
                        key={it.key}
                        item={it}
                        index={i}
                        total={ordered.length}
                        view={props.view}
                        minimized={!open}
                        dragging={dragIdx === i}
                        over={overIdx === i && dragIdx !== null && dragIdx !== i}
                        onSelect={() => props.setView(it.key)}
                        onDragStart={() => setDragIdx(i)}
                        onDragOver={(e) => { e.preventDefault(); setOverIdx(i); }}
                        onDrop={onDrop}
                        onDragEnd={() => { setDragIdx(null); setOverIdx(null); }}
                        onMove={(dir) => move(i, dir)}
                        onRename={() => it.viewId != null && setRenaming({ id: it.viewId, name: it.title })}
                        onDelete={() => {
                            if (it.viewId == null) return;
                            deleteView(it.viewId);
                            if (props.view === it.key) props.setView("adcs");
                        }}
                    />
                ))}
            </div>
            <div className="flex flex-col items-center pb-4">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant={open ? "default" : "ghost"} onClick={() => setBuilding(true)}>
                            <Plus />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                        Create a new view
                    </TooltipContent>
                </Tooltip>
            </div>
            {building && (
                <MopsEditor
                    onCancel={() => setBuilding(false)}
                    onCreate={async (name, blocks) => {
                        setBuilding(false);
                        const created = await createView(name, blocks);
                        if (created) props.setView(`custom-${created.id}`);
                    }}
                />
            )}
            {renaming && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60" onClick={() => setRenaming(null)} />
                    <div className="relative z-10 w-full max-w-sm rounded-lg border bg-background p-5 flex flex-col gap-4">
                        <h3 className="font-semibold">Rename view</h3>
                        <Input
                            autoFocus
                            value={renaming.name}
                            onChange={(e) => setRenaming({ ...renaming, name: e.target.value })}
                            onKeyDown={(e) => { if (e.key === "Enter" && renaming.name.trim()) { renameView(renaming.id, renaming.name.trim()); setRenaming(null); } }}
                        />
                        <div className="flex flex-row justify-end gap-2">
                            <Button variant="ghost" onClick={() => setRenaming(null)}>Cancel</Button>
                            <Button
                                disabled={!renaming.name.trim()}
                                onClick={() => { renameView(renaming.id, renaming.name.trim()); setRenaming(null); }}
                            >
                                Save
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function DashboardView({ params }: {
    params: Promise<{ view: string }>
}) {
    const [view, setView] = useState<string | null>(null);

    const [expanded, setExpanded] = useState(false);

    const _user = bStore.use.user();

    console.log(_user);

    useEffect(() => {
        params.then(p => {
            setView(p.view);
        });
    }, []);

    return view ? (
        <ProjectProvider>
            <div className="flex-1 flex flex-row bg-secondary dark:bg-secondary/50">
                <Sidebar view={view} setView={setView} />
                <div className="flex-1 flex flex-col h-screen max-h-screen overflow-x-hidden">
                    <Heading />
                    <div className="flex-1 flex flex-col justify-end w-full rounded-tl-md overflow-hidden relative bg-background">
                        <div className="w-full h-full overflow-y-auto">
                            <ViewContent view={view} setView={setView} />
                        </div>
                    </div>
                </div>
            </div>
        </ProjectProvider>
    ) : (
        <div className="flex items-center justify-center w-full h-screen">
            <Spinner className="w-10 h-10" />
        </div>
    );
}