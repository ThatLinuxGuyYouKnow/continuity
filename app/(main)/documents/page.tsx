"use client";

import { useCallback, useEffect, useState } from "react";

type Doc = {
  id: string;
  patient_id: string;
  s3_key: string;
  doc_type: string | null;
  extracted_text: string | null;
  uploaded_at: string;
  embedded: boolean;
};

export default function DocumentsPage() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [s3On, setS3On] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/documents");
    const data = await res.json();
    setDocs(data.documents ?? []);
    setS3On(Boolean(data.s3));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function upload() {
    if (!file) return;
    setBusy(true);
    setMsg(null);
    try {
      const step = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type || "application/octet-stream",
          docType: file.name.split(".").pop()?.toLowerCase() === "pdf" ? "pdf" : "chart",
        }),
      });
      const { uploadUrl, error } = await step.json();
      if (error) throw new Error(error);
      const put = await fetch(uploadUrl, { method: "PUT", body: file });
      if (!put.ok) throw new Error("S3 upload failed: " + put.status);
      setMsg("Uploaded to S3. Lambda ingestion will extract memory facts shortly.");
      setFile(null);
      await refresh();
    } catch (e) {
      setMsg("Upload failed: " + (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-100">Documents</h1>
        <p className="text-sm text-zinc-400">
          Upload clinical documents — stored in AWS S3, ingested by Lambda, facts extracted into CockroachDB memory
          (vector-indexed).
        </p>
      </div>

      {!s3On && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-300">
          S3 is not configured. Add AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / S3_BUCKET to .env.local.
        </div>
      )}

      <div className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900 p-4">
        <input
          type="file"
          accept=".txt,.md,.csv,.json,.log"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="text-sm text-zinc-300 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-700 file:px-3 file:py-1.5 file:text-sm file:text-zinc-100"
        />
        <button
          onClick={upload}
          disabled={!file || busy || !s3On}
          className="rounded-md bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? "Uploading…" : "Upload to S3"}
        </button>
      </div>

      {msg && <div className="text-sm text-zinc-300">{msg}</div>}

      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-800 text-zinc-400">
            <th className="py-2 pr-4">Name</th>
            <th className="py-2 pr-4">Type</th>
            <th className="py-2 pr-4">Status</th>
            <th className="py-2">Uploaded</th>
          </tr>
        </thead>
        <tbody>
          {docs.length === 0 && (
            <tr>
              <td colSpan={4} className="py-4 text-zinc-500">
                No documents yet.
              </td>
            </tr>
          )}
          {docs.map((d) => (
            <tr key={d.id} className="border-b border-zinc-800/60">
              <td className="py-2 pr-4 font-mono text-xs text-zinc-300">{d.s3_key.split("/").pop()}</td>
              <td className="py-2 pr-4 text-zinc-400">{d.doc_type ?? "—"}</td>
              <td className="py-2 pr-4">
                {d.embedded ? (
                  <span className="text-emerald-400">ingested</span>
                ) : (
                  <span className="text-amber-400">pending</span>
                )}
              </td>
              <td className="py-2 text-zinc-500">{new Date(d.uploaded_at).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
