import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";
import { Brain, ShieldCheck, Globe, Clock } from "lucide-react";

export default function LoginPage() {
  return (
    <Suspense>
      <div className="flex min-h-screen w-full">
        {/* Solid brand side pane */}
        <div className="relative hidden w-2/5 flex-col justify-between overflow-hidden bg-navy-900 p-10 text-white lg:flex">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-violet-550/20 via-transparent to-transparent" />
          <div className="absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-lime-350/10 blur-3xl" />

          <div className="relative z-10">
            <img src="/logo-full-white.png" alt="Continuity" className="h-8 w-auto" />
          </div>

          <div className="relative z-10 max-w-sm">
            <h2 className="text-3xl font-bold leading-tight">
              Agentic health memory for every patient journey.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-gray-300">
              Continuity remembers every interaction across clinicians, regions, and time — so
              critical health context is always available, even in an emergency.
            </p>

            <div className="mt-8 grid grid-cols-2 gap-4">
              {[
                { icon: Brain, label: "AI-extracted memory" },
                { icon: ShieldCheck, label: "Consent-protected" },
                { icon: Globe, label: "Globally replicated" },
                { icon: Clock, label: "Break-glass ready" },
              ].map((feature) => (
                <div
                  key={feature.label}
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur"
                >
                  <feature.icon className="h-4 w-4 text-lime-350" />
                  <span className="text-xs font-medium">{feature.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative z-10 text-xs text-gray-400">
            © {new Date().getFullYear()} Continuity. Built for clinicians.
          </div>
        </div>

        {/* Main login content */}
        <div className="flex flex-1 items-center justify-center bg-panel p-6 lg:bg-white">
          <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-sm lg:shadow-none lg:p-0">
            <div className="mb-8 lg:hidden">
              <img src="/logo-full.png" alt="Continuity" className="h-7 w-auto" />
            </div>
            <LoginForm />
          </div>
        </div>
      </div>
    </Suspense>
  );
}
