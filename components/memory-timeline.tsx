import { Brain, FileText, Pill, Stethoscope, AlertCircle } from "lucide-react";

const categoryStyles: Record<string, { icon: any; color: string; bg: string }> = {
  diagnosis: { icon: Stethoscope, color: "text-violet-550", bg: "bg-violet-250" },
  medication: { icon: Pill, color: "text-lime-550", bg: "bg-lime-250" },
  allergy: { icon: AlertCircle, color: "text-red-600", bg: "bg-red-100" },
  evidence: { icon: Brain, color: "text-blue-600", bg: "bg-blue-100" },
  note: { icon: FileText, color: "text-gray-700", bg: "bg-gray-200" },
};

export function MemoryTimeline({ data }: { data: any[] }) {
  const events = data ?? [];
  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-navy-900">Memory Timeline</h3>
          <p className="text-xs text-gray-400">Recent facts extracted by the agent</p>
        </div>
        <span className="rounded-full bg-lime-250 px-3 py-1 text-xs font-bold text-navy-900">
          {events.length} facts stored
        </span>
      </div>
      {events.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-400">No memory facts yet.</p>
      ) : (
        <div className="relative space-y-6 pl-2">
          <div className="absolute bottom-2 left-[23px] top-2 w-0.5 bg-gray-100" />
          {events.map((event) => {
            const style = categoryStyles[event.category] ?? categoryStyles.note;
            const Icon = style.icon;
            return (
              <div key={event.id} className="relative flex gap-4">
                <div
                  className={`z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${style.bg}`}
                >
                  <Icon className={`h-5 w-5 ${style.color}`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-navy-900">{event.fact}</p>
                    <span className="whitespace-nowrap text-xs text-gray-400">
                      {new Date(event.extracted_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Source: {event.source} · Confidence: {Math.round(event.confidence * 100)}%
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
