"use client";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "./ui/resizable";
import { Collapsible, CollapsibleTrigger } from "./ui/collapsible";
import { Button } from "./ui/button";
import { CaseUpper, Check, ChevronDown, ChevronUp, CircleQuestionMark, Command, Computer, Crosshair, Database, EllipsisVertical, Expand, Fullscreen, GamepadDirectional, Hash, Pyramid, RadioTower, RefreshCcw, RotateCcw, Settings, SquareTerminal, Terminal, TriangleAlert } from "lucide-react";
import { CollapsibleContent } from "./ui/collapsible";
import { Checkbox } from "./ui/checkbox";
import { Label } from "./ui/label";
import React, { ReactNode, useEffect, useMemo, useRef, useState } from "react";
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
import { buildEnvelope, cn } from "@/lib/utils";
import { CommandBadgeType } from "@/types/ui";
import { allCommands, channelGroups, CmdFormInternalMessage, cmdInternalMessage, CommandDetails, commandDetails, CommandFormProps } from "@/constants/commands";
import { LogTable } from "./views/data-view";
import { Avatar, AvatarImage } from "./ui/avatar";
import { AvatarFallback } from "@radix-ui/react-avatar";
import { authClient } from "@/lib/auth-client";
import { redirect } from "next/navigation";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { Canvas, extend, useFrame, useThree } from '@react-three/fiber';
import { Stats, OrbitControls, KeyboardControls, KeyboardControlsEntry, useKeyboardControls, Line, Text, Tube, Html, Detailed, Billboard, Circle, shaderMaterial, Point, Points } from '@react-three/drei';
import * as topojson from 'topojson-client';
import * as earcut from 'earcut';

import * as THREE from 'three';
import { PlanetThing } from "./planet-testing";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "./ui/dropdown-menu";

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

// export default function ChannelTest() {
//     const _user = bStore.use.user();

//     console.log(_user);

//     return (
//         <div className="flex flex-col h-screen">
//             <Heading />
//             <ResizablePanelGroup direction="horizontal" className="flex-1 relative">
//                 <ResizablePanel defaultSize={30} minSize={20}>
//                     <div className="flex flex-col h-full">
//                         <div className="flex-1 flex flex-row">
//                             <div className="flex flex-col items-center p-2 py-6 border-r gap-4 bg-secondary/10">
//                                 {navElms.map((ne, i) => (
//                                     <NavTile
//                                         key={i}
//                                         selected={i == 0}
//                                         {...ne}
//                                     />
//                                 ))}
//                             </div>
//                             <div className="flex-1 flex flex-col">
//                                 <div className="overflow-scroll p-2">
//                                     <div className="flex flex-col gap-2 overflow-scroll">
//                                         {channelGroups.map((cg, i) => (
//                                             <ChannelMenu
//                                                 key={i}
//                                                 title={cg.group}
//                                                 icon={cg.icon}
//                                                 channels={cg.channels}
//                                             />
//                                         ))}
//                                     </div>
//                                 </div>
//                             </div>
//                         </div>
//                         <UserTile />
//                     </div>
//                 </ResizablePanel>
//                 <ResizableHandle />
//                 <ResizablePanel className="flex flex-col overflow-scroll justify-end">
//                     {/* <ConsoleView/> */}
//                     <SceneWrapper />
//                 </ResizablePanel>
//             </ResizablePanelGroup>
//         </div>
//     );
// }