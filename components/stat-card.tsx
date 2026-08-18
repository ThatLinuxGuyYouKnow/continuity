import { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
  trend,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: LucideIcon;
  accent: "lime" | "violet";
  trend?: { value: string; positive: boolean };
}) {
  const accentClass =
    accent === "lime"
      ? "bg-lime-350 text-navy-900"
      : "bg-violet-350 text-navy-900";
  const trendClass = trend?.positive
    ? "bg-lime-250 text-navy-900"
    : "bg-red-100 text-red-700";

  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-gray-500">{label}</p>
            {trend && (
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${trendClass}`}
              >
                {trend.positive ? "+" : ""}
                {trend.value}
              </span>
            )}
          </div>
          <p className="mt-3 text-3xl font-bold tracking-tight text-navy-900">
            {value}
          </p>
          {sub && <p className="mt-1 text-xs text-gray-400">{sub}</p>}
        </div>
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-2xl ${accentClass}`}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
