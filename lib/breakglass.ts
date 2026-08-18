import { createHmac, randomUUID, timingSafeEqual } from "crypto";

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
