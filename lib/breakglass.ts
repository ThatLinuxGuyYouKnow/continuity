import { createHmac, createHash, randomUUID, timingSafeEqual } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export const BREAK_GLASS_TTL_MINUTES = 60;

const encode = (obj: object) => Buffer.from(JSON.stringify(obj)).toString("base64url");
const decode = (s: string) => JSON.parse(Buffer.from(s, "base64url").toString());

interface Payload {
  mrn: string;
  exp: number;
  jti: string;
}

export interface VerifiedToken {
  mrn: string;
  exp: number;
  jti: string;
}

export function signBreakGlassToken(mrn: string, now = Date.now()): string {
  const payload: Payload = {
    mrn,
    exp: now + BREAK_GLASS_TTL_MINUTES * 60_000,
    jti: randomUUID(),
  };
  const body = encode(payload);
  const sig = createHmac("sha256", process.env.BREAK_GLASS_SECRET!)
    .update(body)
    .digest("base64url");
  return `${body}.${sig}`;
}

export function verifyBreakGlassToken(token: string): VerifiedToken | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;

  const expected = createHmac("sha256", process.env.BREAK_GLASS_SECRET!)
    .update(body)
    .digest("base64url");
  const a = Buffer.from(expected);
  const b = Buffer.from(sig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  let payload: Payload;
  try {
    payload = decode(body);
  } catch {
    return null;
  }
  if (!payload?.mrn || typeof payload.exp !== "number" || payload.exp < Date.now()) {
    return null;
  }

  return { mrn: payload.mrn, exp: payload.exp, jti: payload.jti };
}

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export function isLocalhostHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

export async function storeBreakGlassLink({
  token,
  mrn,
  url,
  createdBy,
  expiresAt,
}: {
  token: string;
  mrn: string;
  url: string;
  createdBy: string;
  expiresAt: string;
}): Promise<{ ok: boolean; id: string | null }> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("break_glass_links")
    .insert({
      token_hash: hashToken(token),
      mrn,
      url,
      created_by: createdBy,
      expires_at: expiresAt,
    })
    .select("id")
    .single();
  if (error) {
    console.error("break_glass_links insert failed:", error.message);
    return { ok: false, id: null };
  }
  return { ok: true, id: data.id };
}

export async function isBreakGlassLinkRevoked(token: string): Promise<boolean> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("break_glass_links")
    .select("status")
    .eq("token_hash", hashToken(token))
    .maybeSingle();
  return data?.status === "revoked";
}

export async function revokeBreakGlassLink(
  token: string,
  revokedBy: string
): Promise<{ ok: boolean; mrn: string | null }> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("break_glass_links")
    .update({ status: "revoked", revoked_at: new Date().toISOString(), revoked_by: revokedBy })
    .eq("token_hash", hashToken(token))
    .select("mrn")
    .single();
  if (error) {
    console.error("break_glass_links revoke failed:", error.message);
    return { ok: false, mrn: null };
  }
  return { ok: true, mrn: data.mrn };
}
