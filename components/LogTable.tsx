"use client"

import * as React from "react"
import {
    ColumnDef,
    ColumnFiltersState,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    Row,
    SortingState,
    useReactTable,
    VisibilityState,
} from "@tanstack/react-table"
import { ArrowUpDown, ChevronDown, MoreHorizontal } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { group } from "console"
import { Badge } from "./ui/badge"
import { Beacon_OpsMode, BeaconSchema } from "@/gen/airis/telemetry/v1/telemetry_pb"
import clsx from "clsx"
import { Collapsible } from "./ui/collapsible"
import { CollapsibleContent, CollapsibleTrigger } from "@radix-ui/react-collapsible"
import { bStore, MessageDetails } from "@/hooks/useAppStore"
import { Message } from "@/gen/messages/transport/v1/transport_pb"
import { ChannelBadge } from "./ChannelTest"

export const columns: ColumnDef<MessageDetails>[] = [
    {
        id: "actions",
        header: ({ table }) => (
            <Checkbox
                checked={
                    table.getIsAllPageRowsSelected() ||
                    (table.getIsSomePageRowsSelected() && "indeterminate")
                }
                onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                aria-label="Select all"
            />
        ),
        cell: ({ row }) => (
            <Checkbox
                checked={row.getIsSelected()}
                onCheckedChange={(value) => row.toggleSelected(!!value)}
                aria-label="Select row"
            />
        ),
        enableSorting: false,
        enableHiding: false,
    },
    {
        accessorKey: "timestamp",
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    Time
                    <ArrowUpDown />
                </Button>
            )
        },
        cell: ({ row }) => <div className="lowercase">{
            <p>{(row.getValue("timestamp") as Date).toLocaleString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
        }</div>,
    },
    {
        accessorKey: "id",
        header: "Id",
        cell: ({ row }) => (
            <Badge
                className="font-mono rounded-md hover:underline underline-offset-2 cursor-pointer bg-secondary text-muted-foreground"
            >
                {row.getValue("id")}
            </Badge>
        ),
    },
    {
        accessorKey: "data",
        header: "Data",
        cell: ({ row }) => {
            const id: MessageDetails["id"] = row.getValue("id");
            
            switch (id) {
            case 'internalMessage':
                const data: Message = row.getValue("data");

                return (
                    <CollapsibleTrigger asChild>
                        <p className="cursor-pointer text-wrap line-clamp-1">
                            {`[${data.heading}] ${data.message}`}
                        </p>
                    </CollapsibleTrigger>
                )
            }
        },
    },
    {
        id: "dropdown",
        header: "",
        cell: ({ row }) => (
            <CollapsibleTrigger asChild>
                <ChevronDown className="w-4 cursor-pointer rotate-0 data-[state=open]:rotate-180 transition-transform delay-100"/>
            </CollapsibleTrigger>
        )
    },
    {
        accessorKey: "group",
        header: () => <div>Group</div>,
        cell: ({ row }) => {
            return (
                <ChannelBadge value={row.getValue("group")}/>
            )
        },
    },
    //   {
    //     id: "actions",
    //     enableHiding: false,
    //     cell: ({ row }) => {
    //       const payment = row.original

    //       return (
    //         <DropdownMenu>
    //           <DropdownMenuTrigger asChild>
    //             <Button variant="ghost" className="h-8 w-8 p-0">
    //               <span className="sr-only">Open menu</span>
    //               <MoreHorizontal />
    //             </Button>
    //           </DropdownMenuTrigger>
    //           <DropdownMenuContent align="end">
    //             <DropdownMenuLabel>Actions</DropdownMenuLabel>
    //             <DropdownMenuItem
    //               onClick={() => navigator.clipboard.writeText(payment.id)}
    //             >
    //               Copy payment ID
    //             </DropdownMenuItem>
    //             <DropdownMenuSeparator />
    //             <DropdownMenuItem>View customer</DropdownMenuItem>
    //             <DropdownMenuItem>View payment details</DropdownMenuItem>
    //           </DropdownMenuContent>
    //         </DropdownMenu>
    //       )
    //     },
    //   },
]


function MessageContent(props: {
    id: MessageDetails["id"],
    data: MessageDetails["data"]
}) {
    switch (props.id) {
    case 'internalMessage':
        const d = props.data as Message;

        return (
            <div className="text-wrap ml-1.5 pl-4 border-l-2 py-2">
                <h4 className="font-semibold">{d.heading}</h4>
                <p>{d.message}</p>
            </div>
        )
    }
}

// don't question my choice to make the collapsible wrap the component
//    it's because of the damn data-state open property
const LogRow = (props: {
    row: Row<MessageDetails>
}) => {
    return (
        <>
            <TableRow
                key={props.row.id}
                data-state={props.row.getIsSelected() && "selected"}
                className="text-secondary-foreground"
            >
                {props.row.getVisibleCells().map((cell) => (
                    <TableCell
                        key={cell.id}
                    >
                        {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                        )}
                    </TableCell>
                ))}
            </TableRow>
            <CollapsibleContent
                asChild
            >
                <TableRow>
                    <TableCell colSpan={6}>
                        <MessageContent
                            id={props.row.getValue("id")}
                            data={props.row.getValue("data")}
                        />
                    </TableCell>
                </TableRow>
            </CollapsibleContent>
        </>
    );
}

export function LogTable() {
    const [sorting, setSorting] = React.useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
        []
    );
    const [columnVisibility, setColumnVisibility] =
        React.useState<VisibilityState>({});
    const [rowSelection, setRowSelection] = React.useState({});

    const data = bStore.use.messages();

    const table = useReactTable({
        data,
        columns,
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        onColumnVisibilityChange: setColumnVisibility,
        onRowSelectionChange: setRowSelection,
        state: {
            sorting,
            columnFilters,
            columnVisibility,
            rowSelection,
        },
    })

    return (
        <div className="w-full">
            <div className="flex items-center pb-4">
                <Input
                    placeholder="Filter by..."
                    value={(table.getColumn("id")?.getFilterValue() as string) ?? ""}
                    onChange={(event) =>
                        table.getColumn("id")?.setFilterValue(event.target.value)
                    }
                    className="max-w-sm"
                />
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="ml-auto">
                            Fields <ChevronDown />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        {table
                            .getAllColumns()
                            .filter((column) => column.getCanHide())
                            .map((column) => {
                                return (
                                    <DropdownMenuCheckboxItem
                                        key={column.id}
                                        className="capitalize"
                                        checked={column.getIsVisible()}
                                        onCheckedChange={(value) =>
                                            column.toggleVisibility(!!value)
                                        }
                                    >
                                        {column.id}
                                    </DropdownMenuCheckboxItem>
                                )
                            })}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            <div className="overflow-hidden rounded-md border">
                <Table className="bg-secondary/30">
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow
                                key={headerGroup.id}
                            >
                                {headerGroup.headers.map((header) => {
                                    return (
                                        <TableHead key={header.id}>
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(
                                                    header.column.columnDef.header,
                                                    header.getContext()
                                                )}
                                        </TableHead>
                                    )
                                })}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <Collapsible
                                    key={row.id}
                                    asChild
                                >
                                    <LogRow
                                        row={row}
                                    />
                                </Collapsible>
                            ))
                        ) : (
                            <TableRow
                            >
                                <TableCell
                                    colSpan={columns.length}
                                    className="h-24 text-center"
                                >
                                    No results.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
            <div className="flex items-center justify-end space-x-2 py-4">
                <div className="text-muted-foreground flex-1 text-sm">
                    {table.getFilteredSelectedRowModel().rows.length} of{" "}
                    {table.getFilteredRowModel().rows.length} messages(s) selected.
                </div>
                <div className="space-x-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                    >
                        Previous
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                    >
                        Next
                    </Button>
                </div>
            </div>
        </div>
    )
}
