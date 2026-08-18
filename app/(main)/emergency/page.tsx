"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, QrCode, ShieldCheck, Globe, Lock, CheckCircle2, RefreshCw, Ban } from "lucide-react";

const REASONS = [
  "ER_TRIAGE_SUSPECTED_ANAPHYLAXIS",
  "POST_OP_EMERGENCY_CODE_BLUE",
  "UNRESPONSIVE_UNKNOWN_ALLERGIES",
  "SURGICAL_CONSULT_CRITICAL_PATH",
];

const REGIONS = ["us-east-1", "us-west-2", "eu-central-1"];

export default function EmergencyPage() {
  const [reason, setReason] = useState(REASONS[0]);
  const [region, setRegion] = useState("us-east-1");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<{
    url: string;
    token: string;
    qrDataUrl: string;
    expiresAt: string;
    expiresInMinutes: number;
    stored: boolean;
  } | null>(null);
  const [linkLoading, setLinkLoading] = useState(true);
  const [revoked, setRevoked] = useState(false);
  const [revoking, setRevoking] = useState(false);

  const loadLink = async () => {
    setLinkLoading(true);
    setRevoked(false);
    try {
      const res = await fetch("/api/emergency/link");
      if (!res.ok) throw new Error("link request failed");
      setLink(await res.json());
    } catch {
      setLink(null);
    } finally {
      setLinkLoading(false);
    }
  };

  useEffect(() => {
    loadLink();
  }, []);

  const revoke = async () => {
    if (!link) return;
    setRevoking(true);
    try {
      const res = await fetch("/api/emergency/link", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: link.token }),
      });
      if (res.ok) {
        setRevoked(true);
      }
    } catch {
      // keep current state on network failure
    } finally {
      setRevoking(false);
    }
  };

  const trigger = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/emergency", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reasonCode: reason, region }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Request failed");
        return;
      }
      setResult(data);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Emergency Access</h2>
        <p className="text-sm text-gray-500">
          Break-glass summary is globally replicated. Access is logged and time-limited.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-3xl bg-dark p-6 text-white">
          <div className="flex items-center gap-3">
            <QrCode className="h-8 w-8 text-lime-350" />
            <div>
              <h3 className="font-semibold">Medical ID Link</h3>
              <p className="text-xs text-gray-400">Scan to open break-glass session</p>
            </div>
          </div>
          <div className="mt-6 flex aspect-square items-center justify-center rounded-2xl bg-white p-4">
            {linkLoading ? (
              <p className="text-sm text-gray-400">Generating link...</p>
            ) : link ? (
              revoked ? (
                <div className="text-center text-dark">
                  <Ban className="mx-auto h-14 w-14 text-red-500" />
                  <p className="mt-3 text-sm font-semibold">Link revoked</p>
                  <p className="mt-1 text-xs text-gray-500">
                    Any device scanning this QR is now denied access.
                  </p>
                </div>
              ) : (
                <div className="text-center text-dark">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={link.qrDataUrl}
                    alt="Medical ID QR code"
                    className="mx-auto h-56 w-56 rounded-lg"
                  />
                  <p className="mt-2 break-all font-mono text-[11px] leading-tight text-gray-500">
                    {link.url}
                  </p>
                </div>
              )
            ) : (
              <p className="text-sm text-red-500">Failed to generate link</p>
            )}
          </div>
          {!linkLoading && link && !revoked && (
            <button
              onClick={revoke}
              disabled={revoking}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-red-500/90 py-2 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-50"
            >
              <Ban className="h-3.5 w-3.5" />
              {revoking ? "Revoking..." : "Revoke link"}
            </button>
          )}
          <button
            onClick={loadLink}
            disabled={linkLoading || revoking}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 py-2 text-xs font-semibold text-white hover:bg-white/20 disabled:opacity-50"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Regenerate (invalidates old link)
          </button>
          <p className="mt-3 text-xs text-gray-400">
            Opens a 60-minute break-glass session. Patient and care team are notified. Every
            read is appended to the global audit log.
          </p>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm lg:col-span-2">
          <div className="mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <h3 className="font-semibold">Simulate Break-Glass Access</h3>
          </div>

          <div className="grid gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                Reason code (required for audit)
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-surface px-4 py-2.5 text-sm outline-none focus:border-violet-450"
              >
                {REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                Emergency region (reads the GLOBAL copy)
              </label>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-surface px-4 py-2.5 text-sm outline-none focus:border-violet-450"
              >
                {REGIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={trigger}
              disabled={loading}
              className="flex items-center justify-center gap-2 rounded-xl bg-red-500 py-3 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-50"
            >
              <Lock className="h-4 w-4" />
              {loading ? "Opening break-glass session..." : "Open Break-Glass Session"}
            </button>

            {error && (
              <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600">{error}</p>
            )}

            {result && (
              <div className="rounded-2xl border border-lime-300 bg-lime-25 p-4">
                <div className="flex items-center gap-2 text-dark">
                  <CheckCircle2 className="h-5 w-5 text-lime-600" />
                  <p className="text-sm font-semibold">
                    Session {result.eventId.slice(0, 8)} opened · expires in{" "}
                    {result.expiresInMinutes} minutes
                  </p>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Audited with reason code · region {region} · patient notified
                </p>
                <div className="mt-3 grid gap-2 text-sm">
                  {result.summary.allergies.length > 0 && (
                    <p>
                      <span className="font-semibold text-red-600">Allergies: </span>
                      {result.summary.allergies.join(", ")}
                    </p>
                  )}
                  {result.summary.medications.length > 0 && (
                    <p>
                      <span className="font-semibold text-dark">Medications: </span>
                      {result.summary.medications.join(", ")}
                    </p>
                  )}
                  {result.summary.conditions.length > 0 && (
                    <p>
                      <span className="font-semibold text-violet-600">Conditions: </span>
                      {result.summary.conditions.join(", ")}
                    </p>
                  )}
                  <p className="flex items-center gap-1 text-xs text-gray-500">
                    <Globe className="h-3 w-3" /> Blood type {result.summary.blood_type} · replicated
                    across all regions
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-3xl bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-violet-450" />
          <h3 className="font-semibold">Replication Status</h3>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {REGIONS.map((r) => (
            <div key={r} className="flex items-center gap-3 rounded-2xl bg-surface p-4">
              <Globe className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium">{r}</p>
                <p className="text-xs text-lime-600">GLOBAL copy synced</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
