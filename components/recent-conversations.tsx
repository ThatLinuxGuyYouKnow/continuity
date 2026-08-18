import { MessageSquare, ArrowUpRight } from "lucide-react";
import Link from "next/link";

export function RecentConversations({ data }: { data: any[] }) {
  const conversations = data ?? [];
  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-navy-900">Recent Conversations</h3>
          <p className="text-xs text-gray-400">Clinician agent sessions</p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-250 text-navy-900">
          <MessageSquare className="h-5 w-5" />
        </div>
      </div>
      <div className="space-y-3">
        {conversations.map((c) => (
          <div
            key={c.id}
            className="group flex items-center justify-between rounded-2xl border border-gray-100 p-4 transition-colors hover:border-violet-200 hover:bg-violet-25"
          >
            <div>
              <p className="text-sm font-semibold text-navy-900">{c.title ?? "Untitled"}</p>
              <p className="text-xs text-gray-500">
                {c.clinician_name} · {Number(c.message_count)} messages
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              {new Date(c.started_at).toLocaleDateString()}
              <ArrowUpRight className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
          </div>
        ))}
      </div>
      <Link href="/chat">
        <button className="mt-4 w-full rounded-2xl bg-navy-900 py-3 text-sm font-semibold text-white transition-colors hover:bg-navy-700">
          Open Agent Chat
        </button>
      </Link>
    </div>
  );
}
