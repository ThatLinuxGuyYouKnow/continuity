import { AlertTriangle, QrCode, Pill, Stethoscope, Droplets, Phone } from "lucide-react";

export function EmergencyCard({ data }: { data: any }) {
  const allergies = data?.allergies ?? [];
  const medications = data?.medications ?? [];
  const conditions = data?.conditions ?? [];
  const contacts = data?.emergency_contacts ?? [];

  return (
    <div className="rounded-3xl bg-navy-900 p-6 text-white shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-lime-350 text-navy-900">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-semibold">Emergency Summary</h3>
          </div>
          <p className="mt-2 text-sm text-gray-400">
            Globally replicated. Accessible by break-glass in any region.
          </p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
          <QrCode className="h-6 w-6 text-lime-350" />
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center gap-2 text-lime-350">
            <Droplets className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wide">Allergies</span>
          </div>
          <ul className="mt-3 space-y-2 text-sm">
            {allergies.map((a: string) => (
              <li key={a} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                {a}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center gap-2 text-lime-350">
            <Pill className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wide">Medications</span>
          </div>
          <ul className="mt-3 space-y-2 text-sm">
            {medications.map((m: string) => (
              <li key={m} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-lime-350" />
                {m}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center gap-2 text-lime-350">
            <Stethoscope className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wide">Conditions</span>
          </div>
          <ul className="mt-3 space-y-2 text-sm">
            {conditions.map((c: string) => (
              <li key={c} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-violet-350" />
                {c}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center gap-2 text-lime-350">
            <Phone className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wide">Contacts</span>
          </div>
          <ul className="mt-3 space-y-2 text-sm">
            {contacts.map((c: any) => (
              <li key={c.name} className="flex justify-between">
                <span>{c.name}</span>
                <span className="text-gray-400">{c.relation}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
