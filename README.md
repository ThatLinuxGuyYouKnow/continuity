# Continuity — Agentic Health Memory

**An AI agent that remembers patient health journeys — with persistent, globally distributed, production-grade memory.**

Built for the **CockroachDB × AWS Hackathon — Build with Agentic Memory**. Continuity is a clinical memory agent: it ingests documents, extracts medical facts, embeds and indexes them in CockroachDB, and answers clinician questions with an agentic tool-call loop backed by a durable, always-on memory layer.

> Memory is not an afterthought here — it is the product. Every fact is a first-class row with an embedding, a confidence score, a source citation, and an audit trail. When a patient arrives at an ER in another region, the agent answers from a memory that was written hours ago on another continent.

---

## How the agent works (the loop)

```
 clinician question
        │
        ▼
 ┌──────────────────────────────┐
 │ 1. Hybrid retrieval (harness)│  ──  Titan Embed v2 (1024-d)
 │    HNSW vector <-> search,   │      vs. keyword fallback
 │    over memory_entries       │      in CockroachDB
 └──────────────┬───────────────┘
                ▼
 ┌──────────────────────────────┐
 │ 2. Nova (Bedrock) decides    │  ──  Converse API, native
 │    answer directly OR call   │      toolUse blocks
 │    a tool                    │
 └──────────────┬───────────────┘
                ▼
 ┌──────────────────────────────┐
 │ 3. Tools execute against     │  • search_memory
 │    CockroachDB               │  • get_emergency_summary
 └──────────────┬───────────────┘  • get_patient_documents
                ▼
 ┌──────────────────────────────┐
 │ 4. Results fed back as       │  ──  up to 3 steps, then a
 │    toolResult; model answers │      sourced, concise reply
 └──────────────┬───────────────┘
                ▼
      audit_log INSERT (every action)
```

Implemented in `app/api/chat/route.ts` (`MAX_AGENT_STEPS = 3`) with native tool-use via the Bedrock Converse API (`lib/bedrock.ts`). The agent never invents facts — it is constrained to answer from retrieved memory and must say so when the memory does not answer.

## Features

- **Persistent agent memory** — `memory_entries` holds every extracted fact with a 1024-dim Titan embedding, HNSW-indexed for `embedding <-> query` semantic search in CockroachDB.
- **Agentic tool-call loop** — Nova Micro reasons over retrieved context and calls tools (`search_memory`, `get_emergency_summary`, `get_patient_documents`) to gather what it needs before answering.
- **Document ingestion pipeline** — S3 upload → Lambda → Nova fact extraction → Titan embeddings → vector inserts into CockroachDB. Text and embeddings for every document also live in the DB, so RAG never leaves the database.
- **Emergency "break-glass" access** — 60-minute time-boxed emergency summary grants, fully audited (`emergency_access_events`).
- **Consent & audit** — `consent_grants` gate what the agent may use; `audit_log` records every agent/clinician action with region, actor, and outcome.
- **Globally distributed by design** — schema carries region metadata; CockroachDB replicates memory across regions with zero data loss.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, React 18, TypeScript, Tailwind |
| Memory layer | CockroachDB Cloud (PostgreSQL-compatible, `VECTOR(1024)`, HNSW indexes) |
| Agent reasoning | Amazon Bedrock — Amazon Nova Micro (Converse API, native tool use) |
| Embeddings | Amazon Bedrock — Titan Embed Text v2 (1024 dims) |
| Ingestion | AWS Lambda + Amazon S3 (event-driven) |
| Observability | AWS CloudWatch |

## CockroachDB tools used (3 of 4)

1. **Cloud Managed MCP Server** — connect agents to the `brave-snapper` cluster with the single config snippet from the Cloud Console; read-only mode + full audit logging.
2. **Distributed Vector Indexing** — `VECTOR(1024)` columns + HNSW indexes on `memory_entries`, `documents`, and `evidence_findings`. No separate vector store, no consistency gaps: the same PostgreSQL-compatible cluster serves transactional memory and semantic search.
3. **ccloud CLI** — cluster provisioning, connection strings, schema/migrations, and backup management from the terminal.

## AWS services used

- **Amazon Bedrock** — Titan Embed Text v2 (embeddings), Nova Micro (agent reasoning + document fact extraction, via Converse API with `toolConfig`).
- **AWS Lambda** — `lambdas/ingest-document` (`index.mjs`): S3 event handler that extracts facts, embeds them, and writes vector rows to CockroachDB.
- **Amazon S3** — document artifact store (`cairn-drops`), presigned upload URLs.
- **AWS CloudWatch** — function logs and metrics for the ingestion pipeline.

## Database schema

Cluster: `brave-snapper` (CockroachDB Cloud, database `continuity`).

- `organizations`, `clinicians`, `patients`, `care_teams`, `consent_grants`
- `emergency_summary`
- `conversations`, `messages`
- `memory_entries`, `documents`, `evidence_findings` — all with `VECTOR(1024)`
- `audit_log`, `emergency_access_events`

Vector + composite indexes (run via `ccloud sql` or any connection):

```sql
CREATE INDEX idx_memory_embedding ON memory_entries USING hnsw (embedding vector_l2_ops);
CREATE INDEX idx_evidence_embedding ON evidence_findings USING hnsw (embedding vector_l2_ops);
CREATE INDEX idx_documents_embedding ON documents USING hnsw (embedding vector_l2_ops);
CREATE INDEX idx_audit_patient_ts ON audit_log (patient_id, ts DESC);
CREATE INDEX idx_memory_patient_category ON memory_entries (patient_id, category);
```

## Local development

```bash
cp .env.local.example .env.local
# fill in DATABASE_URL (CockroachDB) and AWS credentials
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Required env vars:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | CockroachDB connection string (PostgreSQL wire protocol) |
| `BEDROCK_ACCESS_KEY_ID` / `BEDROCK_SECRET_ACCESS_KEY` | AWS credentials for Bedrock |
| `BEDROCK_REGION` | Default `us-east-1` |
| `BEDROCK_CHAT_MODEL` | Default `amazon.nova-micro-v1:0` |
| `BEDROCK_EMBED_MODEL` | Default `amazon.titan-embed-text-v2:0` |
| `S3_BUCKET` / `S3_REGION` | Document upload bucket (default `cairn-drops`) |

Without Bedrock credentials the app degrades gracefully to keyword retrieval — configure Bedrock for the full agentic experience.

## Deployment

### Web app

Deploy `continuity-app` to any Node host (Vercel, ECS, EC2). API routes are Node runtime (`export const runtime = "nodejs"`); set the env vars above.

### Ingestion Lambda

See `lambdas/README.md` for the 5-minute console setup: upload `lambdas/continuity-ingest-document.zip` (Node 20, 30s timeout), set `DATABASE_URL` / `S3_REGION` / `BEDROCK_REGION`, attach an S3 trigger on `s3://cairn-drops/continuity/*`, and grant the execution role `s3:GetObject` + `bedrock:InvokeModel*`.

## Repo layout

```
app/                     Next.js app (pages + API routes)
  api/chat/              Agent tool-call loop (the agent)
  api/documents/         Presigned upload + document listing
  api/emergency/         Break-glass emergency access
  api/overview/          Dashboard data
components/              UI (chat panel, memory timeline, audit summary)
lib/
  bedrock.ts             Bedrock client: embeddings + Converse tool-use
  continuity.ts          CockroachDB queries + hybrid retrieval
  db.ts                  PostgreSQL pool (CockroachDB wire-compatible)
  s3.ts                  Presigned upload URLs
  data.ts                Seed/demo data for the dashboard
lambdas/
  ingest-document/       S3 → facts → embeddings → CockroachDB
scripts/                 Backfill utilities
```

## Demo

- Live app: _add your deployed URL_
- Demo video: _add YouTube/Vimeo link_
- Architecture diagram: `_add link or file_`

## License

[MIT](LICENSE)
