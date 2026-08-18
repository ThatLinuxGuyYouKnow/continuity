import { NextRequest, NextResponse } from "next/server";
import {
  getPatient,
  getEmergencySummary,
  getMemoryTimeline,
  getRecentAudit,
  getRecentConversations,
} from "@/lib/continuity";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const mrn = req.nextUrl.searchParams.get("mrn") ?? "LB-2241-887";
  const patient = await getPatient(mrn);
  if (!patient) {
    return NextResponse.json({ error: "patient not found" }, { status: 404 });
  }

  const [emergency, timeline, audit, conversations] = await Promise.all([
    getEmergencySummary(patient.id),
    getMemoryTimeline(patient.id),
    getRecentAudit(patient.id),
    getRecentConversations(patient.id),
  ]);

  return NextResponse.json({
    patient: {
      id: patient.id,
      mrn: patient.mrn,
      name: patient.name,
      dob: patient.dob,
      bloodType: patient.blood_type,
      consentState: patient.consent_state,
      homeRegion: patient.home_region,
    },
    emergency,
    timeline,
    audit,
    conversations,
  });
}
