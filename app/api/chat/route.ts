import { NextRequest, NextResponse } from "next/server";
import { bedrockConfigured, chatWithTools, type AgentTool } from "@/lib/bedrock";
import {
  logAudit,
  getPatient,
  getEmergencySummary,
  getPatientDocuments,
  searchMemory,
  type MemoryHit,
} from "@/lib/continuity";
import { verifyBreakGlassToken, isBreakGlassLinkRevoked } from "@/lib/breakglass";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const MAX_AGENT_STEPS = 3;

const TOOLS: AgentTool[] = [
  {
    name: "search_memory",
    description:
      "Semantic (vector) + keyword search over the patient's persistent memory in CockroachDB (memory_entries, HNSW-indexed). Use to retrieve facts, conditions, medications, allergies, or past conversations.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "What to search for in the patient's memory" },
        limit: { type: "integer", description: "Max results (default 5)" },
      },
      required: ["query"],
    },
  },
  {
    name: "get_emergency_summary",
    description:
      "Return the patient's emergency summary (allergies, medications, conditions, emergency contacts). Call when the question involves urgent care, emergencies, or anything needing immediate clinical context.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "get_patient_documents",
    description:
      "List the patient's uploaded source documents (charts, notes, labs) with extracted text snippets from S3 ingestion. Call when the question references a specific document or needs verification against source material.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "integer", description: "Max documents (default 5)" },
      },
    },
  },
];

interface Widget {
  type: string;
  data: Record<string, unknown>;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const message = String(body?.message ?? "").trim();
  const mrn = String(body?.mrn ?? "LB-2241-887");
  const breakGlassToken = body?.breakGlassToken ? String(body?.breakGlassToken) : null;

  if (!message) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  // Authorization: a valid break-glass token (capability URL) grants access for
  // the exact patient MRN it was signed for; otherwise require a Supabase session.
  let actorType: string | null = null;
  if (breakGlassToken) {
    const verified = verifyBreakGlassToken(breakGlassToken);
    if (!verified || verified.mrn !== mrn) {
      return NextResponse.json({ error: "invalid break-glass token" }, { status: 401 });
    }
    if (await isBreakGlassLinkRevoked(breakGlassToken)) {
      return NextResponse.json({ error: "break-glass link revoked" }, { status: 403 });
    }
    actorType = "break_glass";
  } else {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    actorType = "clinician";
  }

  const patient = await getPatient(mrn);
  if (!patient) {
    return NextResponse.json({ error: "patient not found" }, { status: 404 });
  }

  const initialHits = await searchMemory(message, patient.id);
  const context =
    initialHits.length > 0
      ? initialHits
          .map(
            (h, i) =>
              `${i + 1}. [${h.category}] ${h.fact} (source: ${h.source}, confidence: ${Math.round(
                h.confidence * 100
              )}%, ${new Date(h.extracted_at).toLocaleDateString()})`
          )
          .join("\n")
      : "No initial matches. Use search_memory for a deeper search, or ask the user for more detail.";

  const system = `You are Continuity, an agentic clinical memory assistant for patient ${patient.name} (MRN ${patient.mrn}).
The patient's persistent memory lives in CockroachDB and is retrieved through your tools.
Rules:
- Answer ONLY from facts you retrieve with your tools. Never invent clinical details.
- Use the initial memory retrieval above as your starting context, and call tools to gather more: search_memory for specific facts, get_emergency_summary for urgent care context, get_patient_documents to verify against source documents.
- If the retrieved facts do not answer the question, say so and ask a clarifying question.
- Keep answers concise, clinically useful, and cite the source when you can.`;

  let reply: string | null = null;
  let steps = 0;
  let agentMode = false;

  const collectedHits: Array<{ category: string; fact: string; confidence: number; source: string }> = [];
  let emergencyData: Record<string, unknown> | null = null;
  let documentData: Array<Record<string, unknown>> | null = null;

  for (const h of initialHits) {
    collectedHits.push({ category: h.category, fact: h.fact, confidence: h.confidence, source: h.source });
  }

  if (bedrockConfigured()) {
    const messages: Array<Record<string, unknown>> = [
      { role: "user", content: [{ text: `Patient question: ${message}\n\nInitial memory retrieval:\n${context}` }] },
    ];

    while (steps < MAX_AGENT_STEPS) {
      steps++;
      const step = await chatWithTools({ system, messages, tools: TOOLS });

      if (step.toolCalls.length === 0) {
        reply = step.text;
        agentMode = true;
        break;
      }

      messages.push({ role: "assistant", content: step.rawContent });

      const results = [];
      for (const call of step.toolCalls) {
        let result: unknown;
        try {
          switch (call.name) {
            case "search_memory": {
              const hits = await searchMemory(String(call.input.query ?? message), patient.id, Number(call.input.limit) || 5);
              result = hits;
              for (const h of hits) {
                if (!collectedHits.some((c) => c.fact === h.fact)) {
                  collectedHits.push({ category: h.category, fact: h.fact, confidence: h.confidence, source: h.source });
                }
              }
              break;
            }
            case "get_emergency_summary": {
              const summary = (await getEmergencySummary(patient.id)) ?? { error: "no emergency summary available" };
              result = summary;
              if (!(summary as any).error) {
                emergencyData = summary as Record<string, unknown>;
              }
              break;
            }
            case "get_patient_documents": {
              const docs = await getPatientDocuments(patient.id, Number(call.input.limit) || 5);
              const mapped = docs.map((d) => ({
                id: d.id,
                doc_type: d.doc_type,
                s3_key: d.s3_key,
                uploaded_at: d.uploaded_at,
                snippet: d.extracted_text ? d.extracted_text.slice(0, 1200) : null,
              }));
              result = mapped;
              documentData = mapped;
              break;
            }
            default:
              result = { error: `unknown tool: ${call.name}` };
          }
        } catch (err) {
          result = { error: err instanceof Error ? err.message : String(err) };
        }
        results.push({ toolUseId: call.toolUseId, content: [{ json: result }], status: "success" });
      }

      messages.push({
        role: "user",
        content: results.map((r) => ({ toolResult: r })),
      });
    }
  }

  if (!reply) {
    reply =
      initialHits.length === 0
        ? "I could not find anything in the patient memory that matches that question."
        : `From ${patient.name}'s memory (retrieved via CockroachDB):\n${initialHits
            .slice(0, 3)
            .map((h: MemoryHit) => `- ${h.fact}`)
            .join("\n")}`;
  }

  await logAudit({
    actor_type: actorType ?? "agent",
    action: "query",
    resource: "memory_entries",
    patient_id: patient.id,
    region: patient.home_region,
    allowed: true,
  });

  const widgets: Widget[] = [];

  widgets.push({
    type: "patient_profile",
    data: {
      name: patient.name,
      mrn: patient.mrn,
      dob: patient.dob,
      blood_type: patient.blood_type,
      home_region: patient.home_region,
    },
  });

  if (collectedHits.length > 0) {
    widgets.push({ type: "memory_hits", data: { hits: collectedHits } });

    const avgConf = collectedHits.reduce((a, h) => a + h.confidence, 0) / collectedHits.length;
    widgets.push({ type: "vector_analytics", data: { hits: collectedHits, avgConfidence: avgConf } });
  }

  if (emergencyData) {
    if ((emergencyData.allergies as string[])?.length > 0) {
      widgets.push({ type: "allergies", data: { allergies: emergencyData.allergies } });
    }
    if ((emergencyData.medications as string[])?.length > 0) {
      widgets.push({ type: "medications", data: { medications: emergencyData.medications } });
    }
    if ((emergencyData.conditions as string[])?.length > 0) {
      widgets.push({ type: "conditions", data: { conditions: emergencyData.conditions } });
    }
    if ((emergencyData.emergency_contacts as any[])?.length > 0) {
      widgets.push({ type: "emergency_contacts", data: { emergency_contacts: emergencyData.emergency_contacts } });
    }
  }

  if (documentData && documentData.length > 0) {
    widgets.push({ type: "sources_evidence", data: { documents: documentData } });
  }

  return NextResponse.json({
    reply,
    mode: agentMode ? "bedrock-agent" : bedrockConfigured() ? "bedrock" : "db-keyword",
    steps,
    hits: collectedHits,
    widgets,
  });
}
