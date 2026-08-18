import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getPatient, logAudit } from "@/lib/continuity";
import { createUploadUrl, s3Configured } from "@/lib/s3";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const mrn = String(body?.mrn ?? "LB-2241-887");
  const fileName = String(body?.fileName ?? "").trim();
  const contentType = String(body?.contentType ?? "application/octet-stream").trim();
  const docType = String(body?.docType ?? "chart").trim();

  if (!fileName) {
    return NextResponse.json({ error: "fileName is required" }, { status: 400 });
  }

  const patient = await getPatient(mrn);
  if (!patient) {
    return NextResponse.json({ error: "patient not found" }, { status: 404 });
  }

  const { uploadUrl, s3Key } = (await createUploadUrl(patient.id, fileName, contentType)) ?? {};
  if (!uploadUrl || !s3Key) {
    return NextResponse.json({ error: "S3 not configured" }, { status: 503 });
  }

  const doc = await query<{ id: string }>(
    `INSERT INTO documents (patient_id, s3_key, doc_type, uploaded_at)
     VALUES ($1, $2, $3, now())
     RETURNING id`,
    [patient.id, s3Key, docType]
  );

  await logAudit({
    actor_type: "clinician",
    action: "document_upload",
    resource: "documents",
    patient_id: patient.id,
    region: process.env.S3_REGION || "us-east-1",
    allowed: true,
  });

  return NextResponse.json({ documentId: doc[0].id, uploadUrl, s3Key });
}

export async function GET() {
  const rows = await query<{
    id: string;
    patient_id: string;
    s3_key: string;
    doc_type: string | null;
    extracted_text: string | null;
    uploaded_at: string;
  }>(
    `SELECT id, patient_id, s3_key, doc_type, extracted_text, uploaded_at
     FROM documents
     ORDER BY uploaded_at DESC
     LIMIT 20`
  );
  return NextResponse.json({
    documents: rows.map((r) => ({
      ...r,
      embedded: Boolean(r.extracted_text),
    })),
    s3: s3Configured(),
  });
}
