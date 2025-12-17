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
import { ArrowUp, Bell, Check, ChevronDown, Command, Cross, Database, ExternalLink, GamepadDirectional, Moon, PanelRightClose, PanelRightOpen, PanelTopClose, Plus, Pyramid, RadioTower, RefreshCcw, Settings, SidebarClose, SidebarOpen, SquareTerminal, Sun, Triangle, TriangleAlert, X } from "lucide-react";
import { redirect } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import ControlsView from "@/components/views/controls-view";
import { Spinner } from "@/components/ui/spinner";
import { StatField } from "@/components/stat-field";
import CDHView from "@/components/views/cdh-view";
import DataView from "@/components/views/data-view";
import { SidebarContent, SidebarFooter, SidebarGroup, SidebarHeader, SidebarProvider } from "@/components/ui/sidebar";

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
        icon: <GamepadDirectional className="w-4"/>,
        title: "MOPS 1",
        id: "mops-1"
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
    const _user = bStore.use.user();

    return _user ? (
        <Button variant="ghost" className="w-8 h-8 relative">
            <Avatar className="w-8 h-8 rounded-md">
                <AvatarImage
                    src={_user?.avatar}
                    alt={`@${_user?.username}`}
                />
                <AvatarFallback>
                    {_user?.username[0]}
                </AvatarFallback>
            </Avatar>
            <div className="absolute -top-1 -right-1 bg-amber-500 rounded-full w-3 h-3 p-px border-2 border-secondary" />
        </Button>
    ) : (<></>);
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
    view: string
}) {
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
        default:
            return <h1 className="text-center">Unknown view</h1>;
    }
}

function ModeTrigger() {
    const [session, setSession] = useState("LIVE");

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                {session === "LIVE" ? (
                    <div className="relative flex flex-row items-center gap-1 text-white rounded-sm bg-red-700 px-2 cursor-pointer">
                        <div className="relative">
                            <span className="absolute w-3 h-3 bg-white opacity-30 rounded-full -mt-0.5 -ml-0.5 animate-ping"/>
                            <div className="w-2 h-2 bg-white rounded-full"/>
                        </div>
                        
                        <p className="font-bold font-mono text-sm">LIVE</p>
                    </div>
                ) : (
                    <div className="relative flex flex-row items-center gap-1 rounded-md bg-muted px-2 py-1 cursor-pointer">
                        <RefreshCcw className="w-3.5 h-3.5"/>
                        <p className="font-bold font-mono text-sm">PLAYBACK</p>
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

    return (
        <div className="sticky top-0 z-50">
            <div className="flex flex-row items-center justify-between text-nowrap gap-10 pr-4">
                <div className="flex flex-row items-center">
                    {/* <a href="https://www.washusatellite.com" className="shrink-0">
                        <img src={"/logo.svg"} alt="" className="h-12 p-2 pb-3"/>
                    </a> */}
                    {/* <div className="w-[0.1rem] h-5 rotate-12 bg-input ml-2 mr-3 rounded-full shrink-0"/> */}
                    <ModeTrigger />
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <div className="flex flex-row items-center p-3 gap-2 group cursor-pointer">
                                {/* <Image src={"/icon.svg"} alt="WashU Satellite" width={30} height={30}/> */}
                                <h1 className="font-bold">AIRIS Mission</h1>
                                <ChevronDown className="w-4"/>
                            </div>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuGroup>
                                <DropdownMenuLabel>
                                    Missions
                                </DropdownMenuLabel>
                            </DropdownMenuGroup>
                            <DropdownMenuSeparator />
                            <DropdownMenuGroup>
                                <DropdownMenuItem>
                                    AIRIS
                                </DropdownMenuItem>
                            </DropdownMenuGroup>
                            <DropdownMenuGroup>
                                <DropdownMenuItem>
                                    SCALAR
                                </DropdownMenuItem>
                            </DropdownMenuGroup>
                            <DropdownMenuGroup>
                                <DropdownMenuItem>
                                    VECTOR
                                </DropdownMenuItem>
                            </DropdownMenuGroup>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
                <div className="flex-row items-end gap-10 py-2 text-foreground/90 hidden lg:flex">
                    <StatField title="Next Pass" value="T-00:54:02"/>
                    <StatField title="Health Status" value="NOMINAL"/>
                    <StatField title="Current Mode" value="STANDBY"/>
                    <StatField title="Link SNR" value="10.24" units="dB"/>
                    <StatField title="Altitude" value="551.35" units="km"/>
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
                                <span className="absolute top-0 right-0 px-1 min-w-4 rounded-full bg-red-500 border-input font-semibold text-[11px] text-white">
                                6
                                </span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuGroup>
                                <DropdownMenuLabel>
                                    Notifications
                                </DropdownMenuLabel>
                            </DropdownMenuGroup>
                            <DropdownMenuSeparator />
                            <DropdownMenuGroup>
                                <p className="p-4 px-8 text-center text-sm">You have no new notifications</p>
                                {/* {(new Array(0)).map(n => (
                                    <DropdownMenuItem className="flex flex-row items-center">
                                        <p className="text-wrap line-clamp-1"></p>
                                        <div className="w-4 h-4 bg-red-500 rounded-full"/>
                                    </DropdownMenuItem>
                                ))} */}
                            </DropdownMenuGroup>
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

function Sidebar(props: {
    view: string,
    setView: (v: string) => void
}) {
    const [open, setOpen] = useState(true);

    return (
        <div className="flex flex-col justify-between items-center">
            <div className="flex flex-col items-center p-3 py-3 gap-4">
                <Button
                    variant="ghost"
                    className="-mb-1 text-secondary-foreground/80"
                    onClick={() => setOpen(o => !o)}
                >
                    {open ? (
                        <SidebarClose />
                    ) : (
                        <SidebarOpen />
                    )}
                </Button>
                {navElms.map((ne, i) => (
                    <NavTile
                        key={i}
                        selected={ne.id === props.view}
                        onClick={() => props.setView(ne.id)}
                        minimized={!open}
                        {...ne}
                    />
                ))}
            </div>
            <div className="flex flex-col items-center pb-4">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant={open ? "default" : "ghost"}>
                            <Plus />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                        Create a new view
                    </TooltipContent>
                </Tooltip>
            </div>
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
        <div className="flex-1 flex flex-row bg-secondary dark:bg-secondary/50">
            <Sidebar view={view} setView={setView} />
            <div className="flex-1 flex flex-col h-screen max-h-screen overflow-x-hidden">
                <Heading />
                <div className="flex-1 flex flex-col justify-end w-full rounded-tl-md overflow-hidden relative bg-background">
                    <div className="w-full h-full overflow-y-auto">
                        <ViewContent view={view} />
                    </div>
                </div>
            </div>
        </div>
    ) : (
        <div className="flex items-center justify-center w-full h-screen">
            <Spinner className="w-10 h-10" />
        </div>
    );
}