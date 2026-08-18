import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";

const region = process.env.S3_REGION || "us-east-1";
const bucket = process.env.S3_BUCKET || "";
const prefix = process.env.S3_PREFIX || "continuity";

const client = new S3Client({
  region,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export function s3Configured(): boolean {
  return Boolean(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && bucket);
}

export async function createUploadUrl(
  patientId: string,
  fileName: string,
  contentType: string,
  expiresIn = 900
): Promise<{ uploadUrl: string; s3Key: string } | null> {
  if (!s3Configured()) return null;
  const s3Key = `${prefix}/${patientId}/${randomUUID()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: s3Key,
    ContentType: contentType,
  });
  const uploadUrl = await getSignedUrl(client, command, { expiresIn });
  return { uploadUrl, s3Key };
}

export function publicObjectUrl(s3Key: string): string {
  return `https://${bucket}.s3.${region}.amazonaws.com/${s3Key}`;
}
