import { NextRequest, NextResponse } from "next/server";
import { getOverview } from "@/lib/continuity";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const mrn = req.nextUrl.searchParams.get("mrn") ?? "LB-2241-887";
  const data = await getOverview(mrn);
  if (!data) {
    return NextResponse.json({ error: "patient not found" }, { status: 404 });
  }
  return NextResponse.json(data);
}
