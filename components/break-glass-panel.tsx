"use client";

import { useState } from "react";
import { CheckCircle2, Globe, Lock } from "lucide-react";

const REASONS = [
  "ER_TRIAGE_SUSPECTED_ANAPHYLAXIS",
  "POST_OP_EMERGENCY_CODE_BLUE",
  "UNRESPONSIVE_UNKNOWN_ALLERGIES",
  "SURGICAL_CONSULT_CRITICAL_PATH",
];

const REGIONS = ["us-east-1", "us-west-2", "eu-central-1"];

export function BreakGlassPanel({
  mrn,
  patientName,
}: {
  mrn: string;
  patientName: string;
}) {
  const [reason, setReason] = useState(REASONS[0]);
  const [region, setRegion] = useState("us-east-1");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openSession = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/emergency", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mrn, reasonCode: reason, region }),
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
    <div className="mt-6 rounded-2xl bg-white/5 p-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
        Patient: {patientName}
      </p>
      <p className="mt-1 text-xs text-gray-500">
        You are opening a 60-minute break-glass session. This action is audited and
        requires a reason code.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-400">
            Reason code (required for audit)
          </label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-dark px-4 py-2.5 text-sm text-white outline-none focus:border-lime-350"
          >
            {REASONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-400">
            Reading region (GLOBAL copy)
          </label>
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-dark px-4 py-2.5 text-sm text-white outline-none focus:border-lime-350"
          >
            {REGIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
      </div>

      <button
        onClick={openSession}
        disabled={loading}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-red-500 py-3 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-50"
      >
        <Lock className="h-4 w-4" />
        {loading ? "Opening break-glass session..." : "Open Break-Glass Session"}
      </button>

      {error && (
        <p className="mt-3 rounded-xl bg-red-500/10 px-4 py-2.5 text-sm text-red-300">
          {error}
        </p>
      )}

      {result && (
        <div className="mt-4 rounded-2xl border border-lime-350/40 bg-lime-350/10 p-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-lime-350" />
            <p className="text-sm font-semibold">
              Session {String(result.eventId).slice(0, 8)} opened · expires in{" "}
              {result.expiresInMinutes} minutes
            </p>
          </div>
          <p className="mt-1 text-xs text-gray-400">
            Audited with reason code · region {region} · patient notified
          </p>
          <div className="mt-3 grid gap-2 text-sm">
            {result.summary.allergies?.length > 0 && (
              <p>
                <span className="font-semibold text-red-400">Allergies: </span>
                {result.summary.allergies.join(", ")}
              </p>
            )}
            {result.summary.medications?.length > 0 && (
              <p>
                <span className="font-semibold">Medications: </span>
                {result.summary.medications.join(", ")}
              </p>
            )}
            {result.summary.conditions?.length > 0 && (
              <p>
                <span className="font-semibold text-violet-350">Conditions: </span>
                {result.summary.conditions.join(", ")}
              </p>
            )}
            <p className="flex items-center gap-1 text-xs text-gray-400">
              <Globe className="h-3 w-3" /> Blood type {result.summary.blood_type} ·
              replicated across all regions
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
