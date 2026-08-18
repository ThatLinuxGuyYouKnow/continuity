import { Brain, FileText, MessageCircle, TrendingUp, AlertTriangle, QrCode } from "lucide-react";
import { MemoryTimeline } from "@/components/memory-timeline";
import { AuditSummary } from "@/components/audit-summary";
import { RecentConversations } from "@/components/recent-conversations";
import { StatCard } from "@/components/stat-card";
import { currentPatient } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? ""}/api/overview`, {
    cache: "no-store",
  });
  const data = await res.json();

  const facts = data.timeline?.length ?? 0;
  const conversations = data.conversations?.length ?? 0;
  const audit = data.audit ?? [];

  const avgConfidence =
    facts > 0
      ? Math.round((data.timeline.reduce((a: number, t: any) => a + t.confidence, 0) / facts) * 100)
      : 0;

  const today = new Date().toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Health Memory Overview
          </p>
          <h2 className="mt-1 text-3xl font-bold tracking-tight text-navy-900">
            Welcome back, {currentPatient.name.split(" ")[0]}
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Agentic memory for {data.patient?.name ?? currentPatient.name} — globally available,
            consent-protected.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400">{today}</span>
          <span className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600">
            {data.patient?.mrn ?? currentPatient.mrn} · {data.patient?.homeRegion ?? "eu-central"}
          </span>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Memory Facts"
          value={facts.toString()}
          sub="Extracted by agent"
          icon={Brain}
          accent="lime"
          trend={{ value: "8%", positive: true }}
        />
        <StatCard
          label="Avg. Confidence"
          value={facts > 0 ? `${avgConfidence}%` : "—"}
          sub="Across all sources"
          icon={TrendingUp}
          accent="violet"
          trend={{ value: "3%", positive: true }}
        />
        <StatCard
          label="Conversations"
          value={conversations.toString()}
          sub="In memory store"
          icon={MessageCircle}
          accent="violet"
        />
        <StatCard
          label="Audit Events"
          value={audit.length.toString()}
          sub="Recent 10 in region"
          icon={FileText}
          accent="lime"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-3xl bg-navy-900 p-6 text-white shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-lime-350 text-navy-900">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-semibold">Emergency Summary</h3>
                </div>
                <p className="mt-2 max-w-md text-sm text-gray-400">
                  Globally replicated. Accessible by break-glass in any region.
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                <QrCode className="h-6 w-6 text-lime-350" />
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {[
                {
                  title: "Allergies",
                  items: data.emergency?.allergies ?? ["Penicillin — severe rash"],
                  dot: "bg-red-400",
                },
                {
                  title: "Medications",
                  items: data.emergency?.medications ?? ["Lisinopril 10mg daily"],
                  dot: "bg-lime-350",
                },
                {
                  title: "Conditions",
                  items: data.emergency?.conditions ?? ["Type 2 diabetes"],
                  dot: "bg-violet-350",
                },
                {
                  title: "Contacts",
                  items:
                    data.emergency?.emergency_contacts?.map(
                      (c: any) => `${c.name} — ${c.relation}`
                    ) ?? ["Maya Bennett — Spouse"],
                  dot: "bg-blue-400",
                },
              ].map((section) => (
                <div
                  key={section.title}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-lime-350">
                    {section.title}
                  </p>
                  <ul className="mt-3 space-y-2 text-sm">
                    {section.items.map((item: string) => (
                      <li key={item} className="flex items-center gap-2">
                        <span className={`h-1.5 w-1.5 rounded-full ${section.dot}`} />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <MemoryTimeline data={data.timeline} />
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-navy-900">Memory Sources</h3>
              <span className="rounded-full bg-violet-250 px-3 py-1 text-xs font-bold text-navy-900">
                {facts} facts
              </span>
            </div>
            <div className="space-y-4">
              {[
                { label: "Conversations", value: 60, color: "bg-violet-450" },
                { label: "Documents", value: 25, color: "bg-lime-450" },
                { label: "Evidence", value: 15, color: "bg-navy-700" },
              ].map((source) => (
                <div key={source.label}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-600">{source.label}</span>
                    <span className="font-bold text-navy-900">{source.value}%</span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
                    <div
                      className={`h-full rounded-full ${source.color}`}
                      style={{ width: `${source.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <RecentConversations data={data.conversations} />
          <AuditSummary data={data.audit} />
        </div>
      </div>
    </div>
  );
}
