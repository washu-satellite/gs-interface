import { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import DataView from "@/components/views/data-view";
import CommandView from "@/components/views/command-view";

export default function CDHView() {
    const [expandSearch, setExpandSearch] = useState(false);
    const [search, setSearch] = useState("");

    return (
        <div className="flex-1 flex flex-col p-4">
            <DataView />
            <CommandView />
        </div>
    );
}