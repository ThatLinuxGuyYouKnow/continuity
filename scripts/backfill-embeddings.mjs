import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import pg from "pg";
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const client = new BedrockRuntimeClient({
  region: process.env.BEDROCK_REGION || process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.BEDROCK_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.BEDROCK_SECRET_ACCESS_KEY || "",
  },
});

const EMBED_MODEL = process.env.BEDROCK_EMBED_MODEL || "amazon.titan-embed-text-v2:0";

async function embedTexts(texts) {
  const out = [];
  for (const text of texts) {
    const res = await client.send(
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

async function main() {
  const rows = await pool.query(
    `SELECT id, fact FROM memory_entries WHERE embedding IS NULL LIMIT 100`
  );
  if (rows.rows.length === 0) {
    console.log("No rows need embeddings.");
    return;
  }
  console.log(`Embedding ${rows.rows.length} memory entries with ${EMBED_MODEL}...`);
  const embeddings = await embedTexts(rows.rows.map((r) => r.fact));
  for (let i = 0; i < rows.rows.length; i++) {
    await pool.query(`UPDATE memory_entries SET embedding = $1::vector WHERE id = $2::uuid`, [
      JSON.stringify(embeddings[i]),
      rows.rows[i].id,
    ]);
  }
  console.log(`Done. ${rows.rows.length} embeddings written.`);
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
