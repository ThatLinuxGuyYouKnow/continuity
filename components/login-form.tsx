"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Eye, EyeOff, Loader2 } from "lucide-react";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const submit = async () => {
    setLoading(true);
    setError(null);
    setNotice(null);
    const supabase = createClient();
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          setError(error.message);
          return;
        }
        router.push(next);
        router.refresh();
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) {
          setError(error.message);
          return;
        }
        if (data.session) {
          router.push(next);
          router.refresh();
        } else {
          setNotice(
            "Account created. Check your inbox for a confirmation link, then sign in."
          );
          setMode("signin");
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const isValid = email.length > 0 && password.length > 0;

  return (
    <div className="w-full max-w-md">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-navy-900">
          {mode === "signin" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          {mode === "signin"
            ? "Sign in to access the agentic health memory dashboard."
            : "Join clinicians using Continuity for persistent patient memory."}
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-navy-900">
            Email address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="clinician@hospital.org"
            className="h-12 w-full rounded-2xl border border-gray-200 bg-surface px-4 text-sm text-navy-900 outline-none transition-all placeholder:text-gray-400 focus:border-violet-450 focus:bg-white focus:ring-4 focus:ring-violet-450/10"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-navy-900">
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="••••••••"
              className="h-12 w-full rounded-2xl border border-gray-200 bg-surface px-4 pr-11 text-sm text-navy-900 outline-none transition-all placeholder:text-gray-400 focus:border-violet-450 focus:bg-white focus:ring-4 focus:ring-violet-450/10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-gray-400 hover:bg-muted hover:text-gray-600"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </p>
      )}
      {notice && (
        <p className="mt-4 rounded-2xl bg-lime-100 px-4 py-3 text-sm text-lime-800">
          {notice}
        </p>
      )}

      <button
        onClick={submit}
        disabled={loading || !isValid}
        className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-navy-900 px-4 text-sm font-semibold text-white transition-all hover:bg-navy-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {loading
          ? "Please wait..."
          : mode === "signin"
            ? "Sign in"
            : "Create account"}
      </button>

      <p className="mt-6 text-center text-sm text-gray-500">
        {mode === "signin" ? "No account yet?" : "Already have an account?"}{" "}
        <button
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setError(null);
            setNotice(null);
          }}
          className="font-semibold text-violet-550 hover:underline"
        >
          {mode === "signin" ? "Create one" : "Sign in"}
        </button>
      </p>

      <p className="mt-8 text-center text-xs text-gray-400">
        By continuing, you agree to Continuity&apos;s clinical access terms.
      </p>
    </div>
  );
}
