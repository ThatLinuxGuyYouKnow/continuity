"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  FileText,
  LogOut,
  MessageSquare,
  ShieldAlert,
  ShieldCheck,
  LayoutDashboard,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const nav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/chat", label: "Agent Chat", icon: MessageSquare },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/emergency", label: "Emergency Access", icon: ShieldAlert },
  { href: "/compliance", label: "Compliance", icon: ShieldCheck },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!cancelled) setEmail(data.user?.email ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <aside className="flex w-64 flex-col bg-navy-800 text-white">
      <div className="flex items-center gap-3 px-6 py-7">
        <img src="/logo-full-white.png" alt="Continuity" className="h-6 w-auto" />
      </div>

      <nav className="flex-1 space-y-1 px-4 py-4">
        {nav.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all ${
                active
                  ? "bg-lime-350 text-navy-900 shadow-sm"
                  : "text-gray-300 hover:bg-white/5 hover:text-white"
              }`}
            >
              <item.icon
                className={`h-5 w-5 transition-colors ${
                  active ? "text-navy-900" : "text-gray-400 group-hover:text-white"
                }`}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-lime-350 to-lime-450 p-5 text-navy-900">
          <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-white/20" />
          <p className="text-xs font-semibold uppercase tracking-wide opacity-70">
            Multi-region
          </p>
          <p className="mt-1 text-sm font-bold">3 regions active</p>
          <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-bold">
            <span className="rounded-full bg-white/40 px-2.5 py-1">us-east</span>
            <span className="rounded-full bg-white/40 px-2.5 py-1">eu-central</span>
            <span className="rounded-full bg-white/40 px-2.5 py-1">us-west</span>
          </div>
        </div>
        <button
          onClick={signOut}
          className="mt-3 flex w-full items-center gap-3 rounded-2xl px-4 py-2.5 text-xs font-medium text-gray-400 transition-colors hover:bg-white/5 hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          <span className="flex-1 truncate text-left">
            {email ? `Sign out (${email})` : "Sign out"}
          </span>
        </button>
      </div>
    </aside>
  );
}
