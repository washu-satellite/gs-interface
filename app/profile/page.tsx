"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { lastView } from "@/lib/last-view";

type Profile = {
    id: string;
    name: string;
    email: string;
    image: string | null;
    permissionLevel: string;
};

export default function ProfilePage() {
    const router = useRouter();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [imageUrl, setImageUrl] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetch("/api/profile")
            .then((r) => (r.ok ? r.json() : null))
            .then((p: Profile | null) => {
                if (!p) {
                    router.push("/sign-in");
                    return;
                }
                setProfile(p);
                setImageUrl(p.image ?? "");
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [router]);

    const save = async () => {
        setSaving(true);
        const res = await fetch("/api/profile", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ image: imageUrl.trim() || null }),
        });
        const updated: Profile = await res.json();
        setProfile(updated);
        setSaving(false);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Spinner className="w-10 h-10" />
            </div>
        );
    }

    if (!profile) return null;

    return (
        <div className="min-h-screen flex flex-col items-center bg-secondary/40 dark:bg-secondary/20 p-6">
            <div className="w-full max-w-lg">
                <Button variant="ghost" size="sm" className="mb-4" onClick={() => router.push(`/dashboard/${lastView()}`)}>
                    <ArrowLeft className="w-4 h-4" /> Back to dashboard
                </Button>

                <div className="rounded-lg border bg-background p-6 flex flex-col gap-6">
                    <div className="flex flex-row items-center gap-4">
                        <Avatar className="w-20 h-20 rounded-lg">
                            <AvatarImage src={imageUrl || undefined} alt={profile.name} />
                            <AvatarFallback className="text-2xl">{profile.name[0]?.toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col gap-1">
                            <h1 className="text-xl font-semibold">{profile.name}</h1>
                            <p className="text-sm text-muted-foreground">{profile.email}</p>
                            <Badge className="w-fit gap-1 bg-blue-500/15 text-blue-500 border-blue-500/30">
                                <ShieldCheck className="w-3 h-3" />
                                {profile.permissionLevel}
                            </Badge>
                        </div>
                    </div>

                    <div className="flex flex-col gap-4 border-t pt-5">
                        <div className="flex flex-col gap-2">
                            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Username</Label>
                            <p className="text-sm font-medium">{profile.name}</p>
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Email</Label>
                            <p className="text-sm font-medium">{profile.email}</p>
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Permission Level</Label>
                            <p className="text-sm font-medium">{profile.permissionLevel}</p>
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="pfp-url">Profile Picture URL</Label>
                            <div className="flex flex-row gap-2">
                                <Input
                                    id="pfp-url"
                                    placeholder="https://…/avatar.png"
                                    value={imageUrl}
                                    onChange={(e) => setImageUrl(e.target.value)}
                                />
                                <Button onClick={save} disabled={saving}>
                                    {saving ? <Spinner className="w-4 h-4" /> : "Save"}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
