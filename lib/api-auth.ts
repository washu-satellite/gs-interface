import { auth } from "@/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export type ApiSession = {
    userId: string;
    name: string;
};

export async function getApiSession(): Promise<ApiSession | null> {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return null;
    return { userId: session.user.id, name: session.user.name };
}

export function unauthorized() {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
}

export async function requireSession(): Promise<
    { session: ApiSession; response: null } | { session: null; response: NextResponse }
> {
    const session = await getApiSession();
    if (!session) return { session: null, response: unauthorized() };
    return { session, response: null };
}
