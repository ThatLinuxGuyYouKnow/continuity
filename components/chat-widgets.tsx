"use client";

import {
  User,
  FileText,
  AlertTriangle,
  Pill,
  Activity,
  Stethoscope,
  Heart,
  Phone,
  ExternalLink,
  BarChart3,
  ShieldCheck,
} from "lucide-react";

export interface WidgetData {
  type: string;
  data: Record<string, unknown>;
}

function WidgetHeader({
  icon: Icon,
  title,
  badge,
  accent = "lime",
}: {
  icon: any;
  title: string;
  badge?: string;
  accent?: "lime" | "red" | "violet";
}) {
  const accentBg =
    accent === "red"
      ? "bg-red-100 text-red-700"
      : accent === "violet"
      ? "bg-violet-250 text-navy-900"
      : "bg-lime-250 text-navy-900";
  return (
    <div className="flex items-center gap-3">
      <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${accentBg}`}>
        <Icon className="h-4 w-4" />
      </div>
      <h4 className="flex-1 text-sm font-bold text-navy-900">{title}</h4>
      {badge && (
        <span className="rounded-full bg-lime-250 px-2 py-0.5 text-[10px] font-bold text-navy-900">
          {badge}
        </span>
      )}
    </div>
  );
}

function Tag({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${color}`}
    >
      {children}
    </span>
  );
}

export function PatientProfileWidget({ data }: { data: any }) {
  const dob = data.dob ? new Date(data.dob) : null;
  const age = dob
    ? Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null;
  const initials = (data.name ?? "P")
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
      <WidgetHeader icon={User} title="Patient Profile" />
      <div className="mt-4 flex items-start gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-450 to-violet-550 text-lg font-bold text-white">
          {initials}
        </div>
        <div className="flex-1 space-y-1.5">
          <p className="text-base font-bold text-navy-900">{data.name}</p>
          {data.mrn && (
            <p className="text-xs text-gray-500">
              MRN <span className="font-mono font-medium text-navy-900">{data.mrn}</span>
            </p>
          )}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
            {age !== null && (
              <span>
                Age <span className="font-semibold text-navy-900">{age}</span>
              </span>
            )}
            {data.dob && (
              <span>
                DOB{" "}
                <span className="font-semibold text-navy-900">
                  {dob!.toLocaleDateString("en-US", {
                    month: "2-digit",
                    day: "2-digit",
                    year: "numeric",
                  })}
                </span>
              </span>
            )}
            {data.blood_type && (
              <span>
                Blood <span className="font-semibold text-navy-900">{data.blood_type}</span>
              </span>
            )}
          </div>
        </div>
        <div className="rounded-xl bg-surface px-3 py-2 text-center">
          <p className="text-[10px] font-medium uppercase text-gray-400">Region</p>
          <p className="mt-0.5 text-xs font-bold text-navy-900">{data.home_region ?? "—"}</p>
        </div>
      </div>
    </div>
  );
}

export function MedicalSummaryWidget({ data }: { data: any }) {
  const conditions: string[] = data.conditions ?? [];
  const allergies: string[] = data.allergies ?? [];
  const medications: string[] = data.medications ?? [];

  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
      <WidgetHeader icon={Stethoscope} title="Medical Summary" />
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        {conditions.length > 0 && (
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Conditions
            </p>
            <div className="flex flex-wrap gap-1.5">
              {conditions.map((c, i) => (
                <Tag key={i} color="bg-violet-250 text-navy-900">
                  {c}
                </Tag>
              ))}
            </div>
          </div>
        )}
        {allergies.length > 0 && (
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-red-400">
              Allergies
            </p>
            <div className="flex flex-wrap gap-1.5">
              {allergies.map((a, i) => (
                <Tag key={i} color="bg-red-100 text-red-700">
                  {a}
                </Tag>
              ))}
            </div>
          </div>
        )}
        {medications.length > 0 && (
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-lime-550">
              Medications
            </p>
            <div className="flex flex-wrap gap-1.5">
              {medications.map((m, i) => (
                <Tag key={i} color="bg-lime-250 text-navy-900">
                  {m}
                </Tag>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function MemoryHitsWidget({ data }: { data: any }) {
  const hits: Array<{ category: string; fact: string; confidence: number; source: string }> =
    data.hits ?? [];
  if (hits.length === 0) return null;

  const categoryColors: Record<string, string> = {
    condition: "bg-violet-250 text-navy-900",
    allergy: "bg-red-100 text-red-700",
    medication: "bg-lime-250 text-navy-900",
    procedure: "bg-amber-100 text-amber-800",
    lab: "bg-sky-100 text-sky-800",
    note: "bg-muted text-gray-700",
  };

  const avgConfidence =
    hits.reduce((a, h) => a + h.confidence, 0) / hits.length;

  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
      <WidgetHeader icon={Activity} title="Memory Retrieved" badge={`${hits.length} facts`} />
      <div className="mt-4 space-y-2">
        {hits.map((h, i) => {
          const pct = Math.round(h.confidence * 100);
          return (
            <div key={i} className="flex items-start gap-3">
              <span
                className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  categoryColors[h.category] ?? "bg-muted text-gray-600"
                }`}
              >
                {h.category}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-navy-900 leading-snug">{h.fact}</p>
                <div className="mt-1 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full ${
                        pct >= 80
                          ? "bg-lime-450"
                          : pct >= 50
                          ? "bg-amber-400"
                          : "bg-red-400"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-medium text-gray-400">{pct}%</span>
                </div>
                {h.source && (
                  <p className="mt-0.5 text-[10px] text-gray-400">
                    Source: {h.source}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex items-center gap-2 rounded-xl bg-surface px-3 py-2">
        <BarChart3 className="h-3.5 w-3.5 text-gray-400" />
        <span className="text-[10px] font-medium text-gray-500">
          Avg confidence{" "}
          <span className="font-bold text-navy-900">{Math.round(avgConfidence * 100)}%</span>
        </span>
      </div>
    </div>
  );
}

export function SourcesEvidenceWidget({ data }: { data: any }) {
  const docs: Array<{
    id: string;
    doc_type: string | null;
    s3_key: string;
    uploaded_at: string;
    snippet: string | null;
  }> = data.documents ?? [];
  if (docs.length === 0) return null;

  const typeIcons: Record<string, any> = {
    pdf: FileText,
    docx: FileText,
    txt: FileText,
    png: FileText,
    jpg: FileText,
  };

  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
      <WidgetHeader icon={FileText} title="Sources & Evidence" badge={`${docs.length} docs`} />
      <div className="mt-4 space-y-2">
        {docs.map((d) => {
          const ext = d.s3_key.split(".").pop()?.toLowerCase() ?? "file";
          const Icon = typeIcons[ext] ?? FileText;
          const filename = d.s3_key.split("/").pop() ?? d.s3_key;
          return (
            <div
              key={d.id}
              className="flex items-center gap-3 rounded-xl border border-gray-100 bg-surface/50 px-3 py-2.5 transition-colors hover:bg-surface"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-250">
                <Icon className="h-4 w-4 text-violet-550" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-navy-900">{filename}</p>
                {d.snippet && (
                  <p className="mt-0.5 line-clamp-1 text-[11px] text-gray-400">
                    {d.snippet.slice(0, 120)}
                  </p>
                )}
              </div>
              <ExternalLink className="h-3.5 w-3.5 shrink-0 text-gray-300" />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function VectorAnalyticsWidget({ data }: { data: any }) {
  const hits: Array<{ confidence: number }> = data.hits ?? [];
  if (hits.length === 0) return null;

  const buckets = [0, 0, 0, 0, 0];
  const labels = ["< 40%", "40–59%", "60–79%", "80–89%", "90–100%"];
  for (const h of hits) {
    const pct = h.confidence * 100;
    const idx = pct < 40 ? 0 : pct < 60 ? 1 : pct < 80 ? 2 : pct < 90 ? 3 : 4;
    buckets[idx]++;
  }
  const max = Math.max(...buckets, 1);

  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
      <WidgetHeader icon={BarChart3} title="Vector Analytics" accent="violet" />
      <div className="mt-4 flex items-end gap-2">
        {buckets.map((count, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-1">
            <span className="text-[10px] font-bold text-navy-900">{count}</span>
            <div className="relative w-full overflow-hidden rounded-t-lg bg-muted" style={{ height: 60 }}>
              <div
                className={`absolute bottom-0 w-full rounded-t-lg transition-all ${
                  i === 4
                    ? "bg-lime-450"
                    : i === 3
                    ? "bg-lime-350"
                    : i === 2
                    ? "bg-violet-350"
                    : i === 1
                    ? "bg-violet-250"
                    : "bg-gray-200"
                }`}
                style={{ height: `${(count / max) * 100}%` }}
              />
            </div>
            <span className="text-[9px] text-gray-400">{labels[i]}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2 rounded-xl bg-surface px-3 py-2">
        <ShieldCheck className="h-3.5 w-3.5 text-lime-550" />
        <span className="text-[10px] font-medium text-gray-500">
          Nova confidence{" "}
          <span className="font-bold text-navy-900">
            {Math.round(
              (hits.reduce((a, h) => a + h.confidence, 0) / hits.length) * 100
            )}
            %
          </span>
        </span>
      </div>
    </div>
  );
}

export function EmergencyContactsWidget({ data }: { data: any }) {
  const contacts: Array<{ name: string; relation: string; phone: string }> =
    data.emergency_contacts ?? [];
  if (contacts.length === 0) return null;

  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
      <WidgetHeader icon={Phone} title="Emergency Contacts" accent="red" />
      <div className="mt-4 space-y-2">
        {contacts.map((c, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-xl border border-gray-100 bg-surface/50 px-3 py-2.5"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-red-100 text-sm font-bold text-red-700">
              {c.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)}
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-navy-900">{c.name}</p>
              <p className="text-[11px] text-gray-400">{c.relation}</p>
            </div>
            <a
              href={`tel:${c.phone}`}
              className="text-xs font-medium text-violet-450 hover:underline"
            >
              {c.phone}
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MedicationsWidget({ data }: { data: any }) {
  const meds: string[] = data.medications ?? [];
  if (meds.length === 0) return null;

  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
      <WidgetHeader icon={Pill} title="Medications" />
      <div className="mt-4 space-y-2">
        {meds.map((m, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-xl bg-lime-250/30 px-3 py-2"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-lime-250">
              <Pill className="h-3.5 w-3.5 text-navy-900" />
            </div>
            <span className="text-sm font-medium text-navy-900">{m}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AllergiesWidget({ data }: { data: any }) {
  const allergies: string[] = data.allergies ?? [];
  if (allergies.length === 0) return null;

  return (
    <div className="rounded-3xl border border-red-100 bg-white p-5 shadow-sm">
      <WidgetHeader icon={AlertTriangle} title="Allergies (Critical)" accent="red" />
      <div className="mt-4 flex flex-wrap gap-2">
        {allergies.map((a, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1.5 text-sm font-semibold text-red-700"
          >
            <AlertTriangle className="h-3 w-3" />
            {a}
          </span>
        ))}
      </div>
      <p className="mt-3 text-[10px] text-gray-400">
        Source: Attribution (Clinical Factcast)
      </p>
    </div>
  );
}

export function ConditionsWidget({ data }: { data: any }) {
  const conditions: string[] = data.conditions ?? [];
  if (conditions.length === 0) return null;

  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
      <WidgetHeader icon={Heart} title="Conditions" accent="violet" />
      <div className="mt-4 flex flex-wrap gap-2">
        {conditions.map((c, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1.5 rounded-full bg-violet-250 px-3 py-1.5 text-sm font-semibold text-navy-900"
          >
            <Heart className="h-3 w-3 text-violet-550" />
            {c}
          </span>
        ))}
      </div>
    </div>
  );
}

export function renderWidgets(widgets: WidgetData[]) {
  return widgets.map((w, i) => {
    switch (w.type) {
      case "patient_profile":
        return <PatientProfileWidget key={i} data={w.data} />;
      case "medical_summary":
        return <MedicalSummaryWidget key={i} data={w.data} />;
      case "memory_hits":
        return <MemoryHitsWidget key={i} data={w.data} />;
      case "sources_evidence":
        return <SourcesEvidenceWidget key={i} data={w.data} />;
      case "vector_analytics":
        return <VectorAnalyticsWidget key={i} data={w.data} />;
      case "emergency_contacts":
        return <EmergencyContactsWidget key={i} data={w.data} />;
      case "medications":
        return <MedicationsWidget key={i} data={w.data} />;
      case "allergies":
        return <AllergiesWidget key={i} data={w.data} />;
      case "conditions":
        return <ConditionsWidget key={i} data={w.data} />;
      default:
        return null;
    }
  });
}
