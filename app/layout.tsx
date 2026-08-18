import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Continuity — Agentic Health Memory",
  description: "AI agent that remembers every patient interaction, globally.",
  icons: { icon: "/favicon.png" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
