import { CheckCircle2, XCircle, ShieldAlert, ShieldCheck } from "lucide-react";

export function AuditSummary({ data }: { data: any[] }) {
  const events = data ?? [];
  const denied = events.filter((e) => !e.allowed).length;
  const allowed = events.filter((e) => e.allowed).length;

  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-navy-900">Access & Audit</h3>
          <p className="text-xs text-gray-400">Recent permission events</p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-250 text-navy-900">
          <ShieldCheck className="h-5 w-5" />
        </div>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-lime-250 p-4 text-center text-navy-900">
          <p className="text-2xl font-bold">{allowed}</p>
          <p className="text-xs font-bold">Allowed</p>
        </div>
        <div className="rounded-2xl bg-red-100 p-4 text-center text-red-700">
          <p className="text-2xl font-bold">{denied}</p>
          <p className="text-xs font-bold">Denied</p>
        </div>
      </div>

      <div className="space-y-3">
        {events.map((event) => (
          <div
            key={event.id}
            className="flex items-center justify-between rounded-2xl border border-gray-100 p-3 transition-colors hover:border-violet-200 hover:bg-violet-25"
          >
            <div className="flex items-center gap-3">
              {event.allowed ? (
                <CheckCircle2 className="h-4 w-4 text-lime-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
              <div>
                <p className="text-xs font-semibold text-navy-900">{event.actor_type}</p>
                <p className="text-[10px] text-gray-400">
                  {event.action} · {event.resource} · {event.region}
                </p>
              </div>
            </div>
            <div className="text-right">
              {event.reason && (
                <span className="flex items-center gap-1 text-[10px] text-amber-600">
                  <ShieldAlert className="h-3 w-3" /> {event.reason}
                </span>
              )}
              <p className="text-[10px] text-gray-400">
                {new Date(event.ts).toLocaleString()}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
