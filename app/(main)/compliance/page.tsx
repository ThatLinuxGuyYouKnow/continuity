import { ShieldCheck, AlertCircle, Eye, Lock } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CompliancePage() {
  let data: any = {};
  try {
    const res = await fetch("/api/overview", { cache: "no-store" });
    if (res.ok) data = await res.json();
  } catch {
    data = {};
  }
  const events: any[] = data.audit ?? [];

  const total = events.length;
  const denied = events.filter((e: any) => !e.allowed).length;
  const breakGlass = events.filter((e: any) => e.action === "break_glass").length;
  const score = total > 0 ? Math.round(((total - denied) / total) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Compliance & Audit</h2>
        <p className="text-sm text-gray-500">
          Every memory access is recorded globally. Break-glass events require reason codes.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <MetricCard label="Audit Events (recent)" value={total.toString()} icon={Eye} />
        <MetricCard label="Break-Glass Events" value={breakGlass.toString()} icon={AlertCircle} />
        <MetricCard label="Denied Requests" value={denied.toString()} icon={Lock} />
        <MetricCard label="Access Success Rate" value={`${score}%`} icon={ShieldCheck} />
      </div>

      <div className="rounded-3xl bg-white p-6 shadow-sm">
        <h3 className="mb-4 font-semibold">Audit Log</h3>
        {events.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">No audit events yet.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-gray-500">
                <th className="pb-3 font-medium">Time</th>
                <th className="pb-3 font-medium">Actor</th>
                <th className="pb-3 font-medium">Action</th>
                <th className="pb-3 font-medium">Resource</th>
                <th className="pb-3 font-medium">Region</th>
                <th className="pb-3 font-medium">Result</th>
                <th className="pb-3 font-medium">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {events.map((e: any) => (
                <tr key={e.id}>
                  <td className="py-3 text-gray-500">{new Date(e.ts).toLocaleString()}</td>
                  <td className="py-3 font-medium">{e.actor_type}</td>
                  <td className="py-3">{e.action}</td>
                  <td className="py-3">{e.resource}</td>
                  <td className="py-3 text-gray-500">{e.region}</td>
                  <td className="py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        e.allowed ? "bg-lime-250 text-dark" : "bg-red-100 text-red-700"
                      }`}
                    >
                      {e.allowed ? "Allowed" : "Denied"}
                    </span>
                  </td>
                  <td className="py-3 text-gray-500">{e.reason || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function MetricCard({ label, value, icon: Icon }: { label: string; value: string; icon: any }) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-250 text-dark">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-gray-500">{label}</p>
        </div>
      </div>
    </div>
  );
}
