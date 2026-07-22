import { signFeedToken } from "@/lib/calendar-feed";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const token = await signFeedToken(id);
    const url = new URL(`/api/calendar/${token}.ics`, req.nextUrl.origin).toString();
    return NextResponse.json({ token, url });
}
