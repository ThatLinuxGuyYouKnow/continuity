# Continuity Lambda: S3 → Memory Ingestion

Triggered on every upload to `s3://cairn-drops/continuity/<patient-id>/`, this function:

1. Reads the object from S3
2. Asks **Amazon Nova Micro** to extract discrete medical facts (JSON)
3. Embeds each fact with **Amazon Titan Embed Text v2** (1024 dims, first-party models)
4. Inserts rows into `memory_entries` (vector-indexed by HNSW) + updates `documents`
5. The agent chat then retrieves these facts via `embedding <-> $1::vector` search

## Deploy (console, ~5 min)

The `cairn-s3-uploader` IAM user only has S3 rights, so create the function in the AWS console:

1. **Lambda → Create function → Author from scratch**
   - Name: `continuity-ingest-document`
   - Runtime: **Node.js 20.x**
   - Architecture: x86_64
   - Permissions: Create a new role (auto)
2. **Upload code**: Upload from `.zip` → `lambdas/continuity-ingest-document.zip`
3. **Runtime settings → Edit**: Handler stays `index.handler`
4. **Configuration → Environment variables**:

   | Key | Value |
   |---|---|
   | `DATABASE_URL` | CockroachDB connection string from `.env.local` |
   | `S3_REGION` | `us-east-1` |
   | `BEDROCK_REGION` | `us-east-1` |

   (Models default to `amazon.titan-embed-text-v2:0` + `amazon.nova-micro-v1:0`; override with `BEDROCK_EMBED_MODEL` / `BEDROCK_CHAT_MODEL` if needed.)

5. **Configuration → General → Timeout**: 30 s (memory 512 MB)
6. **Add trigger → S3** → bucket `cairn-drops`, event types `All object create events`, prefix `continuity/`
7. **IAM role**: open the function's execution role → add inline policy:

   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": ["s3:GetObject"],
         "Resource": "arn:aws:s3:::cairn-drops/continuity/*"
       },
       {
         "Effect": "Allow",
         "Action": ["bedrock:InvokeModel", "bedrock:InvokeModelWithResponseStream"],
         "Resource": "*"
       }
     ]
   }
   ```

8. Cluster reachability: `brave-snapper` already allows `0.0.0.0/0` on SQL — no allowlist change needed.

## Local smoke test

```bash
# from project root — embeds existing memory_entries (Titan, 1024 dims)
node scripts/backfill-embeddings.mjs
```

## Rebuild the zip after code changes

```bash
cd lambdas/ingest-document && zip -qr ../continuity-ingest-document.zip index.mjs node_modules package.json
```
