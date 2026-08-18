import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
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

  const counts = await query<any>(
    `SELECT 'memory' AS table_name, count(*)::text FROM memory_entries WHERE patient_id = $1
     UNION ALL
     SELECT 'documents', count(*)::text FROM documents WHERE patient_id = $1
     UNION ALL
     SELECT 'conversations', count(*)::text FROM conversations WHERE patient_id = $1
     UNION ALL
     SELECT 'audit', count(*)::text FROM audit_log WHERE patient_id = $1`,
    [patient.id]
  );

  const sourceBreakdown = await query<any>(
    `SELECT source, count(*)::text FROM memory_entries WHERE patient_id = $1 GROUP BY source`,
    [patient.id]
  );

  const countMap: Record<string, number> = {};
  for (const row of counts) countMap[row.table_name] = Number(row.count);

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
    counts: {
      memory: countMap.memory ?? 0,
      documents: countMap.documents ?? 0,
      conversations: countMap.conversations ?? 0,
      audit: countMap.audit ?? 0,
    },
    sourceBreakdown: sourceBreakdown.map((r) => ({ source: r.source, count: Number(r.count) })),
  });
}
