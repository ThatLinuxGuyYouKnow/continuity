import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Break-Glass Access — Continuity",
  robots: { index: false, follow: false },
};

export default function EmergencyPortalLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <div className="min-h-screen bg-dark text-white">{children}</div>;
}
