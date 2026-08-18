"use client";

import { Search, Bell, ChevronDown, Globe } from "lucide-react";

export function Topbar() {
  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200/60 bg-white/80 px-6 backdrop-blur">
      <div className="flex items-center gap-4">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search memory, patients, evidence..."
            className="h-10 w-80 rounded-full border border-gray-200 bg-gray-50 pl-10 pr-4 text-sm outline-none transition-all placeholder:text-gray-400 focus:border-violet-450 focus:bg-white focus:ring-2 focus:ring-violet-450/20"
          />
        </div>
      </div>

      <div className="flex items-center gap-5">
        <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-600">
          <Globe className="h-4 w-4 text-violet-450" />
          <span>eu-central-1</span>
          <span className="h-2 w-2 rounded-full bg-lime-450" />
        </div>

        <button className="relative rounded-full border border-gray-200 bg-white p-2.5 text-gray-600 transition-colors hover:bg-gray-50">
          <Bell className="h-5 w-5" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
        </button>

        <button className="flex items-center gap-3 rounded-full border border-gray-200 bg-white px-3 py-1.5 transition-colors hover:bg-gray-50">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-450 to-violet-550 text-sm font-semibold text-white">
            CL
          </div>
          <div className="hidden text-left md:block">
            <p className="text-xs font-bold text-gray-900">Dr. Chen</p>
            <p className="text-[10px] text-gray-500">Cardiology</p>
          </div>
          <ChevronDown className="h-4 w-4 text-gray-400" />
        </button>
      </div>
    </header>
  );
}
