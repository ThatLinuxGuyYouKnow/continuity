import { AlertTriangle, ShieldOff, Clock } from "lucide-react";
import { verifyBreakGlassToken, isBreakGlassLinkRevoked } from "@/lib/breakglass";
import { getPatient } from "@/lib/continuity";
import { BreakGlassPanel } from "@/components/break-glass-panel";

export default async function EmergencyAccessPage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  const { t } = await searchParams;
  const token = t ? verifyBreakGlassToken(t) : null;

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-md rounded-3xl bg-white/5 p-8 text-center">
          <ShieldOff className="mx-auto h-12 w-12 text-red-400" />
          <h1 className="mt-4 text-xl font-bold">Invalid or expired access link</h1>
          <p className="mt-2 text-sm text-gray-400">
            This break-glass link is signed, single-use in intent, and expires 60 minutes
            after it is generated. Ask the care team to mint a fresh Medical ID link.
          </p>
        </div>
      </div>
    );
  }

  if (t && (await isBreakGlassLinkRevoked(t))) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-md rounded-3xl bg-white/5 p-8 text-center">
          <ShieldOff className="mx-auto h-12 w-12 text-red-400" />
          <h1 className="mt-4 text-xl font-bold">Access link revoked</h1>
          <p className="mt-2 text-sm text-gray-400">
            This break-glass link was revoked by the care team. Ask them to mint a fresh
            Medical ID link.
          </p>
        </div>
      </div>
    );
  }

  const patient = await getPatient(token.mrn);
  if (!patient) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-md rounded-3xl bg-white/5 p-8 text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-400" />
          <h1 className="mt-4 text-xl font-bold">Patient record not found</h1>
          <p className="mt-2 text-sm text-gray-400">MRN {token.mrn} has no continuity record.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center p-4 sm:p-6">
      <div className="rounded-3xl bg-white/5 p-5 sm:p-8">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-8 w-8 text-lime-350" />
          <div>
            <h1 className="text-xl font-bold">Continuity — Break-Glass Access</h1>
            <p className="text-sm text-gray-400">
              Verified emergency link for MRN {token.mrn}
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-2xl bg-red-500/10 px-4 py-3 text-xs text-red-300">
          <Clock className="h-4 w-4 shrink-0" />
          <span>
            Session expires at{" "}
            {new Date(token.exp).toLocaleTimeString()} · every read is appended to the global
            audit log · patient and care team are notified
          </span>
        </div>

        <BreakGlassPanel mrn={token.mrn} patientName={patient.name} breakGlassToken={t} />
      </div>
    </div>
  );
}
