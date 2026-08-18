import { query } from "@/lib/db";
import { embedTexts } from "@/lib/bedrock";

export interface PatientRow {
  id: string;
  mrn: string;
  name: string;
  dob: string | null;
  gender: string | null;
  blood_type: string | null;
  consent_state: string;
  home_region: string;
}

export interface EmergencySummaryRow {
  patient_id: string;
  allergies: string[];
  medications: string[];
  conditions: string[];
  blood_type: string | null;
  emergency_contacts: Array<{ name: string; relation: string; phone: string }> | null;
  updated_at: string;
}

export interface MemoryEntryRow {
  id: string;
  patient_id: string;
  category: string;
  fact: string;
  source: string;
  confidence: number;
  extracted_at: string;
}

export interface AuditLogRow {
  id: string;
  ts: string;
  actor_type: string;
  action: string;
  resource: string;
  region: string | null;
  allowed: boolean;
  reason: string | null;
}

export interface ConversationRow {
  id: string;
  title: string | null;
  started_at: string;
  clinician_name: string;
  message_count: number;
}

export interface DocumentRow {
  id: string;
  patient_id: string;
  s3_key: string;
  doc_type: string | null;
  extracted_text: string | null;
  uploaded_at: string;
}

export interface MemoryHit {
  category: string;
  fact: string;
  source: string;
  confidence: number;
  extracted_at: string;
}

// Hybrid retrieval over CockroachDB: HNSW vector search first (Titan embeddings,
// 1024 dims), keyword fallback when embeddings are unavailable or miss.
export async function searchMemory(queryText: string, patientId: string, limit = 5): Promise<MemoryHit[]> {
  const embedding = await embedTexts([queryText]);
  if (embedding) {
    const hits = await query<MemoryHit>(
      `SELECT category, fact, source, confidence, extracted_at
       FROM memory_entries
       WHERE patient_id = $1 AND embedding IS NOT NULL
       ORDER BY embedding <-> $2::vector
       LIMIT $3`,
      [patientId, JSON.stringify(embedding[0]), limit]
    );
    if (hits.length > 0) return hits;
  }
  return keywordSearch(queryText, patientId, limit);
}

async function keywordSearch(queryText: string, patientId: string, limit = 5): Promise<MemoryHit[]> {
  const raw = queryText
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2);
  const terms = new Set<string>();
  for (const t of raw) {
    terms.add(t);
    const singular = t.endsWith("ies") ? t.slice(0, -3) + "y" : t.endsWith("s") ? t.slice(0, -1) : t;
    if (singular.length > 2) terms.add(singular);
  }
  const termList = [...terms];
  if (termList.length === 0) return [];
  const params: unknown[] = [patientId];
  const clause = termList
    .map((_, i) => {
      params.push(`%${termList[i]}%`);
      return `(lower(fact) LIKE $${params.length} OR lower(category) LIKE $${params.length})`;
    })
    .join(" OR ");
  return query<MemoryHit>(
    `SELECT category, fact, source, confidence, extracted_at
     FROM memory_entries
     WHERE patient_id = $1 AND (${clause})
     ORDER BY confidence DESC
     LIMIT $2`,
    [...params, limit]
  );
}

export function getPatientDocuments(patientId: string, limit = 10): Promise<DocumentRow[]> {
  return query<DocumentRow>(
    `SELECT id, patient_id, s3_key, doc_type, extracted_text, uploaded_at
     FROM documents
     WHERE patient_id = $1
     ORDER BY uploaded_at DESC
     LIMIT $2`,
    [patientId, limit]
  );
}

export function getPatient(mrn: string): Promise<PatientRow | undefined> {
  return query<PatientRow>("SELECT * FROM patients WHERE mrn = $1", [mrn]).then(
    (r) => r[0]
  );
}

export function getEmergencySummary(patientId: string): Promise<EmergencySummaryRow | undefined> {
  return query<EmergencySummaryRow>(
    "SELECT * FROM emergency_summary WHERE patient_id = $1",
    [patientId]
  ).then((r) => r[0]);
}

export function getMemoryTimeline(patientId: string, limit = 12): Promise<MemoryEntryRow[]> {
  return query<MemoryEntryRow>(
    "SELECT id, patient_id, category, fact, source, confidence, extracted_at FROM memory_entries WHERE patient_id = $1 ORDER BY extracted_at DESC LIMIT $2",
    [patientId, limit]
  );
}

export function getRecentAudit(patientId: string, limit = 10): Promise<AuditLogRow[]> {
  return query<AuditLogRow>(
    "SELECT id, ts, actor_type, action, resource, region, allowed, reason FROM audit_log WHERE patient_id = $1 ORDER BY ts DESC LIMIT $2",
    [patientId, limit]
  );
}

export function getRecentConversations(patientId: string, limit = 5): Promise<ConversationRow[]> {
  return query<ConversationRow>(
    `SELECT c.id, c.title, c.started_at, cl.name AS clinician_name,
            (SELECT count(*) FROM messages m WHERE m.conversation_id = c.id) AS message_count
     FROM conversations c
     JOIN clinicians cl ON cl.id = c.clinician_id
     WHERE c.patient_id = $1
     ORDER BY c.started_at DESC
     LIMIT $2`,
    [patientId, limit]
  );
}

export async function getOverview(mrn: string) {
  const patient = await getPatient(mrn);
  if (!patient) return null;

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

  return {
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
  };
}

export function ensureClinician(args: {
  id: string;
  name: string;
}): Promise<void> {
  return query(
    `INSERT INTO clinicians (id, name, specialty)
     VALUES ($1, $2, 'Emergency Medicine')
     ON CONFLICT (id) DO NOTHING`,
    [args.id, args.name]
  ).then(() => undefined);
}

export function logAudit(entry: {
  actor_type: string;
  actor_id?: string | null;
  action: string;
  resource: string;
  patient_id?: string | null;
  region?: string | null;
  allowed: boolean;
  reason?: string | null;
}): Promise<void> {
  return query(
    `INSERT INTO audit_log (actor_type, actor_id, action, resource, patient_id, region, allowed, reason)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      entry.actor_type,
      entry.actor_id ?? null,
      entry.action,
      entry.resource,
      entry.patient_id ?? null,
      entry.region ?? null,
      entry.allowed,
      entry.reason ?? null,
    ]
  ).then(() => undefined);
}
