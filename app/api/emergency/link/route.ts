import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/server";
import { signBreakGlassToken, BREAK_GLASS_TTL_MINUTES } from "@/lib/breakglass";

export const runtime = "nodejs";

const DEFAULT_MRN = "LB-2241-887";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "authentication required" }, { status: 401 });
  }

  const mrn = String(req.nextUrl.searchParams.get("mrn") ?? DEFAULT_MRN).trim();
  const token = signBreakGlassToken(mrn);
  const base = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin;
  const url = `${base}/e?t=${encodeURIComponent(token)}`;

  const qrDataUrl = await QRCode.toDataURL(url, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 480,
  });

  return NextResponse.json({
    mrn,
    url,
    qrDataUrl,
    expiresInMinutes: BREAK_GLASS_TTL_MINUTES,
    expiresAt: new Date(Date.now() + BREAK_GLASS_TTL_MINUTES * 60_000).toISOString(),
  });
}
