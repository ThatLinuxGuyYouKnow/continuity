import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/server";
import { getPatient, logAudit } from "@/lib/continuity";
import {
  signBreakGlassToken,
  BREAK_GLASS_TTL_MINUTES,
  isLocalhostHost,
  storeBreakGlassLink,
  revokeBreakGlassLink,
} from "@/lib/breakglass";

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
  const isLocal = isLocalhostHost(req.nextUrl.hostname);
  const base = isLocal
    ? process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin
    : req.nextUrl.origin;
  const url = `${base}/e?t=${encodeURIComponent(token)}`;
  const expiresAt = new Date(Date.now() + BREAK_GLASS_TTL_MINUTES * 60_000).toISOString();

  let stored = false;
  let linkId: string | null = null;
  if (!isLocal) {
    const result = await storeBreakGlassLink({ token, mrn, url, createdBy: user.id, expiresAt });
    stored = result.ok;
    linkId = result.id;
  }

  const qrDataUrl = await QRCode.toDataURL(url, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 480,
  });

  return NextResponse.json({
    mrn,
    url,
    token,
    qrDataUrl,
    expiresInMinutes: BREAK_GLASS_TTL_MINUTES,
    expiresAt,
    stored,
    linkId,
  });
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "authentication required" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const token = String(body?.token ?? "").trim();
  if (!token) {
    return NextResponse.json({ error: "token is required" }, { status: 400 });
  }

  const { ok, mrn } = await revokeBreakGlassLink(token, user.id);
  if (!ok) {
    return NextResponse.json({ error: "link not found or already revoked" }, { status: 404 });
  }

  const patient = mrn ? await getPatient(mrn) : null;
  if (patient) {
    await logAudit({
      actor_type: "clinician",
      actor_id: user.id,
      action: "revoke_break_glass",
      resource: "break_glass_link",
      patient_id: patient.id,
      region: patient.home_region,
      allowed: true,
      reason: "clinician revoked emergency link",
    });
  }

  return NextResponse.json({
    ok: true,
    revoked: true,
    mrn,
    revokedAt: new Date().toISOString(),
    revokedBy: user.id,
  });
}
