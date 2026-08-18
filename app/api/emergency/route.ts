import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getPatient, getEmergencySummary, logAudit, ensureClinician } from "@/lib/continuity";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const DEFAULT_ER_CLINICIAN = "a32600f9-8175-4e2b-823d-704187734dde"; // Dr. Sofia Marques, Emergency Medicine

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const mrn = String(body?.mrn ?? "LB-2241-887");
  const reasonCode = String(body?.reasonCode ?? "").trim();
  const region = String(body?.region ?? "us-east-1");

  if (!reasonCode) {
    return NextResponse.json({ error: "reasonCode is required for break-glass access" }, { status: 400 });
  }

  // Identity is resolved server-side: a signed-in clinician is attributed by
  // Supabase session; an external scanner gets the system emergency actor.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const actorType = user ? "clinician" : "system";
  const clinicianId = user?.id ?? DEFAULT_ER_CLINICIAN;

  if (user) {
    const fullName =
      (user.user_metadata?.full_name as string) ??
      (user.email?.split("@")[0] ?? "Clinician");
    const prettyName = fullName
      .split(/[\s_.-]+/)
      .filter(Boolean)
      .map((p) => p[0].toUpperCase() + p.slice(1))
      .join(" ");
    await ensureClinician({ id: user.id, name: prettyName });
  }

  const patient = await getPatient(mrn);
  if (!patient) {
    return NextResponse.json({ error: "patient not found" }, { status: 404 });
  }

  const summary = await getEmergencySummary(patient.id);
  if (!summary) {
    return NextResponse.json({ error: "no emergency summary available" }, { status: 404 });
  }

  const grant = await query<{ id: string }>(
    `INSERT INTO emergency_access_events (patient_id, clinician_id, reason_code, session_expires_at)
     VALUES ($1, $2, $3, now() + interval '60 minutes')
     RETURNING id`,
    [patient.id, clinicianId, reasonCode]
  );

  await logAudit({
    actor_type: actorType,
    actor_id: clinicianId,
    action: "break_glass",
    resource: "emergency_summary",
    patient_id: patient.id,
    region,
    allowed: true,
    reason: reasonCode,
  });

  return NextResponse.json({
    eventId: grant[0].id,
    expiresInMinutes: 60,
    summary,
    audited: true,
    actorType,
  });
}
