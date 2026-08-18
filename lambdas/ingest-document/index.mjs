import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { BedrockRuntimeClient, ConverseCommand, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import pg from "pg";

const s3 = new S3Client({ region: process.env.S3_REGION || "us-east-1" });
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 1,
});

const BEDROCK_REGION = process.env.BEDROCK_REGION || "us-east-1";
const EMBED_MODEL = process.env.BEDROCK_EMBED_MODEL || "amazon.titan-embed-text-v2:0";
const CHAT_MODEL = process.env.BEDROCK_CHAT_MODEL || "amazon.nova-micro-v1:0";
const bedrock = new BedrockRuntimeClient({ region: BEDROCK_REGION });

export async function handler(rawEvent) {
  let event = rawEvent ?? {};
  if (rawEvent?.body) {
    try {
      const decoded = rawEvent.isBase64Encoded ? Buffer.from(rawEvent.body, "base64").toString("utf-8") : rawEvent.body;
      const parsed = JSON.parse(decoded);
      if (parsed && typeof parsed === "object") event = parsed;
    } catch {
      // not JSON — treat raw event as-is
    }
  }
  const records = event?.Records ?? [];
  const results = [];
  for (const record of records) {
    const bucket = record.s3?.bucket?.name;
    const key = record.s3?.object?.key;
    if (!bucket || !key || !key.startsWith("continuity/")) {
      results.push({ key, status: "skipped" });
      continue;
    }
    try {
      const outcome = await ingest(bucket, key);
      results.push({ key, ...outcome });
    } catch (err) {
      console.error("ingest failed", key, err);
      results.push({ key, status: "error", error: String(err.message || err) });
    }
  }
  return { statusCode: 200, body: JSON.stringify(results) };
}

async function ingest(bucket, key) {
  const obj = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const bytes = await obj.Body.transformToByteArray();
  const name = key.split("/").pop() || key;

  const ext = name.split(".").pop()?.toLowerCase();
  const text = decodeText(bytes, ext);
  if (!text) return { status: "skipped", reason: "unsupported type: " + ext };

  const patientId = key.split("/")[1];
  if (!patientId) return { status: "skipped", reason: "missing patient id in key" };

  const facts = await extractFacts(text, name);
  const inserted = await storeFacts(patientId, facts, key, name);

  const docEmbedding = await embed([text.slice(0, 2000)]);
  await pool.query(
    `UPDATE documents
     SET extracted_text = $1, embedding = $2::vector
     WHERE patient_id = $3::uuid AND s3_key = $4`,
    [text.slice(0, 8000), docEmbedding?.[0] ? JSON.stringify(docEmbedding[0]) : null, patientId, key]
  );

  return { status: "ok", factsInserted: inserted };
}

function decodeText(bytes, ext) {
  let raw;
  try {
    raw = new TextDecoder("utf-8").decode(bytes);
  } catch {
    return null;
  }
  if (["txt", "md", "markdown", "csv", "json", "log"].includes(ext)) return raw;
  return null;
}

async function extractFacts(text, name) {
  const prompt = `Extract discrete medical memory facts from the clinical document below.
Return ONLY a JSON array, no prose. Each item: {"category": "allergy|medication|condition|vital|note|social", "fact": "one-sentence clinical fact", "confidence": 0.0-1.0}.
Skip billing/administrative noise. Max 8 facts.
Document (${name}):\n${text.slice(0, 12000)}`;
  try {
    const res = await bedrock.send(
      new ConverseCommand({
        modelId: CHAT_MODEL,
        messages: [{ role: "user", content: [{ text: prompt }] }],
        inferenceConfig: { maxTokens: 1024, temperature: 0.1 },
      })
    );
    const json = res.output?.message?.content?.[0]?.text;
    if (!json) return [];
    const match = json.match(/\[[\s\S]*\]/);
    if (!match) return [];
    const arr = JSON.parse(match[0]);
    return Array.isArray(arr)
      ? arr.filter((f) => f.fact && f.category).map((f) => ({ category: String(f.category), fact: String(f.fact), confidence: Number(f.confidence ?? 0.7) }))
      : [];
  } catch (err) {
    console.error("extractFacts failed:", err);
    return [];
  }
}

async function storeFacts(patientId, facts, key, name) {
  if (facts.length === 0) return 0;
  const embeddings = await embed(facts.map((f) => f.fact));
  let count = 0;
  for (let i = 0; i < facts.length; i++) {
    const f = facts[i];
    const emb = embeddings?.[i] ? JSON.stringify(embeddings[i]) : null;
    await pool.query(
      `INSERT INTO memory_entries (patient_id, category, fact, embedding, source, confidence, extracted_at)
       VALUES ($1::uuid, $2, $3, $4::vector, $5, $6, now())`,
      [patientId, f.category, f.fact, emb, `s3://${key}`, Math.min(1, Math.max(0, f.confidence))]
    );
    count++;
  }
  return count;
}

async function embed(texts) {
  const out = [];
  for (const text of texts) {
    const res = await bedrock.send(
      new InvokeModelCommand({
        modelId: EMBED_MODEL,
        contentType: "application/json",
        accept: "application/json",
        body: Buffer.from(JSON.stringify({ inputText: text.slice(0, 8000), dimensions: 1024, normalize: true })),
      })
    );
    const parsed = JSON.parse(Buffer.from(res.body).toString("utf-8"));
    out.push((parsed.embedding ?? []).slice(0, 1024).map(Math.fround));
  }
  return out;
}
