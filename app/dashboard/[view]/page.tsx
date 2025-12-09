"use client";
import { Button } from "@/components/ui/button";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import CommandView from "@/components/views/command-view";
import { channelGroups } from "@/constants/commands";
import { bStore } from "@/hooks/useAppStore";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Bell, Check, ChevronDown, Database, GamepadDirectional, PanelRightClose, PanelRightOpen, Pyramid, RadioTower, RefreshCcw, SquareTerminal, TriangleAlert } from "lucide-react";
import { redirect } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import ControlsView from "@/components/views/controls-view";
import { Spinner } from "@/components/ui/spinner";
import { StatField } from "@/components/stat-field";
import CDHView from "@/components/views/cdh-view";
import DataView from "@/components/views/data-view";

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

function NavTile(props: NavTileType & { selected?: boolean, onClick: () => void }) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <button
                    className={cn(
                        "flex flex-col items-center gap-1 p-2 w-16 rounded-md cursor-pointer hover:bg-accent/70 text-primary/80 hover:text-primary",
                        {
                            "bg-accent/70 text-foreground": props.selected
                        }
                    )}
                    onClick={props.onClick}
                >
                    {props.icon}
                    <p className="text-xs">{props.title}</p>
                </button>
            </TooltipTrigger>
            {props.description &&
                <TooltipContent>
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

    return (
        <div className="flex flex-row gap-2 flex-wrap p-4 w-full border-t">
            {_user &&
                <Avatar className="w-12 h-12">
                    <AvatarImage
                        src={_user?.avatar}
                        alt={`@${_user?.username}`}
                    />
                    <AvatarFallback>
                        {_user?.username[0]}
                    </AvatarFallback>
                </Avatar>
            }
        </div>
    );
}

function ViewContent(props: {
    view: string
}) {
    switch (props.view) {
        case "command":
            return (
                <div className="flex-1 flex flex-col p-4">
                    <CommandView />
                </div>
            );
        case "adcs":
            return <ControlsView />;
        case "cdh":
            return <CDHView />;
        case "data":
            return (
                <div className="flex-1 flex flex-col p-4">
                    <DataView />
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
                    <div className="relative flex flex-row items-center gap-1 text-white rounded-md bg-red-700 px-2 cursor-pointer">
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
                    <DropdownMenuItem onClick={() => setSession("LIVE")}>
                        Live Stream
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSession("Playback")}>
                        Recordings
                    </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                    <DropdownMenuItem>
                        Pass #123
                        <span className="bg-muted rounded-md px-2 py-1 -my-1">10/23/25</span>
                        12:23:12 CST
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                        Pass #122
                        <span className="bg-muted rounded-md px-2 py-1 -my-1">10/23/25</span>
                        12:23:12 CST
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                        Pass #121
                        <span className="bg-muted rounded-md px-2 py-1 -my-1">10/23/25</span>
                        12:23:12 CST
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                        Pass #120
                        <span className="bg-muted rounded-md px-2 py-1 -my-1">10/23/25</span>
                        12:23:12 CST
                    </DropdownMenuItem>
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
    return (
        <div className="flex flex-row items-center justify-between border-b text-nowrap gap-10 px-2">
            <div className="flex flex-row items-center">
                <a href="https://www.washusatellite.com" className="shrink-0">
                    <img src={"/logo.svg"} alt="" className="h-12 p-2 pb-3"/>
                </a>
                <div className="w-[0.1rem] h-5 rotate-12 bg-input ml-2 mr-3 rounded-full shrink-0"/>
                <ModeTrigger />
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <div className="flex flex-row items-center p-3 gap-2 group cursor-pointer">
                            {/* <Image src={"/icon.svg"} alt="WashU Satellite" width={30} height={30}/> */}
                            <h1 className="font-bold">AIRIS Mission</h1>
                            <ChevronDown className="w-4 opacity-0 group-hover:opacity-100"/>
                        </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
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
            <Button variant="outline" className="relative">
                <Bell />
                <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-red-500 border-input border"/>
            </Button>
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
        <div className="flex flex-col h-screen">
            <Heading />
                {expanded ? (
                <ResizablePanelGroup direction="horizontal" className="flex-1">
                    <ResizablePanel defaultSize={30} minSize={20}>
                        <div className="flex flex-col h-full">
                            <div className="flex-1 flex flex-row">
                                <div className="flex flex-col items-center justify-between border-r bg-secondary/10 pb-4">
                                    <div className="flex flex-col items-center p-3 gap-4 ">
                                        {navElms.map((ne, i) => (
                                            <NavTile
                                                key={i}
                                                selected={ne.id === view}
                                                onClick={() => setView(ne.id)}
                                                {...ne}
                                            />
                                        ))}
                                    </div>
                                    <Button variant="ghost" onClick={() => setExpanded(false)}>
                                        <PanelRightOpen />
                                    </Button>
                                </div>
                                {/* <div className="flex-1 flex flex-col">
                                    <div className="overflow-scroll p-2">
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
                                </div> */}
                            </div>
                            <UserTile />
                        </div>
                    </ResizablePanel>
                    <ResizableHandle />
                    <ResizablePanel className="overflow-scroll">
                        {/* <ConsoleView/> */}
                        <ViewContent view={view} />
                    </ResizablePanel>
                </ResizablePanelGroup>
                ) : (
                    <div className="flex-1 flex flex-row">
                        <div className="flex flex-col justify-between items-center border-r bg-secondary/10">
                            <div className="flex flex-col items-center p-3 gap-4">
                                {navElms.map((ne, i) => (
                                    <NavTile
                                        key={i}
                                        selected={ne.id === view}
                                        onClick={() => setView(ne.id)}
                                        {...ne}
                                    />
                                ))}
                            </div>
                            <div className="flex flex-col items-center gap-4 text-primary/80">
                                <Button variant="ghost" onClick={() => setExpanded(true)}>
                                    <PanelRightClose />
                                </Button>
                                <UserTileMinimal />
                            </div>
                        </div>
                        <div className="flex flex-col justify-end w-full overflow-scroll">
                            <ViewContent view={view} />
                        </div>
                    </div>
                )}
                
        </div>
    ) : (
        <div className="flex items-center justify-center w-full h-screen">
            <Spinner className="w-10 h-10" />
        </div>
    );
}