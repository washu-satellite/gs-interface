import { signLookAngleToken } from "@/lib/look-angle-feed";
import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { response: unauth } = await requireSession();
    if (unauth) return unauth;

    const { id } = await params;
    const token = await signLookAngleToken(id);
    const url = new URL(`/api/look-angle/${token}`, req.nextUrl.origin).toString();
    return NextResponse.json({ token, url });
}
