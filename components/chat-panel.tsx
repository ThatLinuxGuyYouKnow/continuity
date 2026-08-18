"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User } from "lucide-react";
import { renderWidgets, type WidgetData } from "@/components/chat-widgets";

interface Msg {
  role: "agent" | "user";
  text: string;
  meta?: string;
  widgets?: WidgetData[];
}

export function ChatPanel() {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "agent",
      text: "Hi, I'm the Continuity memory agent. Ask me about Lucas's history, allergies, medications — I'll retrieve from the CockroachDB memory store.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, loading]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const text = input.trim();
    setMessages((m) => [...m, { role: "user", text }]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, mrn: "LB-2241-887" }),
      });
      const data = await res.json();
      setMessages((m) => [
        ...m,
        {
          role: "agent",
          text: data.reply ?? "Sorry, I could not retrieve an answer.",
          meta:
            data.mode === "bedrock-agent"
              ? `Bedrock agent · ${data.steps} tool step${data.steps === 1 ? "" : "s"} · HNSW vector memory`
              : data.mode === "bedrock"
              ? "Nova + HNSW vector search"
              : "CockroachDB keyword retrieval",
          widgets: data.widgets ?? [],
        },
      ]);
    } catch (e) {
      setMessages((m) => [...m, { role: "agent", text: "Network error — is the server up?" }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full flex-col rounded-3xl bg-white shadow-sm">
      <div className="border-b border-gray-100 p-4">
        <h3 className="font-semibold">Agent Chat</h3>
        <p className="text-xs text-gray-500">CockroachDB vector memory + Bedrock Nova</p>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                m.role === "agent" ? "bg-violet-250" : "bg-lime-250"
              }`}
            >
              {m.role === "agent" ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
            </div>
            <div className={`max-w-[85%] min-w-0 ${m.role === "agent" ? "" : "flex flex-col items-end"}`}>
              <div
                className={`rounded-2xl px-4 py-2.5 text-sm ${
                  m.role === "agent" ? "bg-muted text-gray-800" : "bg-dark text-white"
                }`}
              >
                {m.text}
              </div>
              {m.widgets && m.widgets.length > 0 && (
                <div className="mt-3 space-y-3">
                  {renderWidgets(m.widgets)}
                </div>
              )}
              {m.meta && (
                <p className="mt-1 text-[10px] text-gray-400">{m.meta}</p>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-250">
              <Bot className="h-4 w-4" />
            </div>
            <div className="rounded-2xl bg-muted px-4 py-2.5 text-sm text-gray-500">
              <span className="inline-flex gap-1">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:150ms]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:300ms]" />
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-gray-100 p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Ask about patient memory..."
            className="flex-1 rounded-xl border border-gray-200 bg-surface px-4 py-2.5 text-sm outline-none focus:border-violet-450 focus:ring-1 focus:ring-violet-450"
          />
          <button
            onClick={send}
            disabled={loading}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-dark text-white hover:bg-gray-800 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
