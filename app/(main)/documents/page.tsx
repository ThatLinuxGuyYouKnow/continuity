"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Search,
  Upload,
  FileText,
  File,
  Eye,
  Download,
  Clock,
  Trash2,
  Filter,
  ChevronDown,
  Loader2,
} from "lucide-react";

type Doc = {
  id: string;
  patient_id: string;
  s3_key: string;
  doc_type: string | null;
  extracted_text: string | null;
  uploaded_at: string;
  embedded: boolean;
};

const STATUS = ["Indexed", "Vectorized", "Processing"] as const;

function statusFor(doc: Doc) {
  if (doc.embedded) return "Vectorized";
  if (doc.extracted_text) return "Indexed";
  return "Processing";
}

function statusColor(s: string) {
  if (s === "Indexed" || s === "Vectorized") return "bg-lime-250 text-navy-900";
  return "bg-amber-100 text-amber-800";
}

function fileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return <FileText className="h-5 w-5 text-red-400" />;
  if (ext === "docx" || ext === "doc") return <File className="h-5 w-5 text-blue-400" />;
  return <FileText className="h-5 w-5 text-gray-400" />;
}

function relativeTime(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function DocumentsPage() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [s3On, setS3On] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [showFilter, setShowFilter] = useState(false);
  const [dragOver, setDragOver] = useState(false);

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

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) setFile(dropped);
  }

  const filtered = docs.filter((d) => {
    const name = d.s3_key.split("/").pop() ?? "";
    const matchSearch = !search || name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || statusFor(d) === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Documents</h2>
        <p className="text-sm text-gray-500">
          Clinical Documents — Secure storage (AWS S3), advanced processing (Ingested by Lambda,
          fact-extracted), and ready for vector-search (CockroachDB).
        </p>
      </div>

      {!s3On && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          S3 is not configured. Add AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / S3_BUCKET to
          .env.local.
        </div>
      )}

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`rounded-3xl border-2 border-dashed p-8 text-center transition-colors ${
          dragOver
            ? "border-lime-450 bg-lime-250/20"
            : "border-gray-200 bg-surface/50"
        }`}
      >
        <Upload className="mx-auto h-10 w-10 text-gray-300" />
        <p className="mt-3 text-sm font-medium text-gray-600">
          Drag & drop clinical files here, or click to browse (up to 500MB).
        </p>
        <p className="mt-1 text-xs text-gray-400">
          Files are ingested and vectorized for AI access.
        </p>
        <input
          type="file"
          accept=".txt,.md,.csv,.json,.log,.pdf,.docx,.doc"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="hidden"
          id="doc-upload"
        />
        <label
          htmlFor="doc-upload"
          className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-dark px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
        >
          <Upload className="h-4 w-4" />
          Choose file
        </label>
        {file && (
          <div className="mt-3 flex items-center justify-center gap-3 text-sm">
            <span className="text-gray-600">{file.name}</span>
            <button
              onClick={upload}
              disabled={busy || !s3On}
              className="rounded-xl bg-lime-350 px-4 py-1.5 text-xs font-semibold text-navy-900 hover:bg-lime-450 disabled:opacity-50"
            >
              {busy ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading...
                </span>
              ) : (
                "Upload to S3"
              )}
            </button>
          </div>
        )}
      </div>

      {busy && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          S3 ingestion progress...
        </div>
      )}

      {msg && (
        <p className={`text-sm ${msg.includes("failed") ? "text-red-600" : "text-gray-600"}`}>
          {msg}
        </p>
      )}

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search clinical documents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-xl border border-gray-200 bg-surface pl-10 pr-4 text-sm outline-none focus:border-violet-450 focus:ring-2 focus:ring-violet-450/20"
          />
        </div>
        <div className="relative">
          <button
            onClick={() => setShowFilter(!showFilter)}
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-surface px-4 py-2.5 text-sm text-gray-600 hover:bg-muted"
          >
            Filter
            <ChevronDown className="h-4 w-4" />
          </button>
          {showFilter && (
            <div className="absolute right-0 top-full z-10 mt-1 w-44 rounded-xl border border-gray-200 bg-white p-2 shadow-lg">
              {STATUS.map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setStatusFilter(statusFilter === s ? null : s);
                    setShowFilter(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm ${
                    statusFilter === s
                      ? "bg-lime-250 font-semibold text-navy-900"
                      : "text-gray-600 hover:bg-surface"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-3xl bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-gray-500">
              <th className="px-6 py-4 font-medium">Document Name</th>
              <th className="px-6 py-4 font-medium">Type</th>
              <th className="px-6 py-4 font-medium">Status</th>
              <th className="px-6 py-4 font-medium">Size</th>
              <th className="px-6 py-4 font-medium">Date Uploaded</th>
              <th className="px-6 py-4 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-gray-400">
                  No documents yet.
                </td>
              </tr>
            )}
            {filtered.map((d) => {
              const name = d.s3_key.split("/").pop() ?? d.s3_key;
              const status = statusFor(d);
              return (
                <tr key={d.id} className="hover:bg-surface/50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted">
                        {fileIcon(name)}
                      </div>
                      <span className="font-medium text-navy-900">{name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    {(d.doc_type ?? name.split(".").pop() ?? "—").toUpperCase()}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusColor(status)}`}
                    >
                      {status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-400">—</td>
                  <td className="px-6 py-4 text-gray-500">{relativeTime(d.uploaded_at)}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5">
                      <button className="rounded-lg p-2 text-gray-400 hover:bg-muted hover:text-navy-900">
                        <Eye className="h-4 w-4" />
                      </button>
                      <button className="rounded-lg p-2 text-gray-400 hover:bg-muted hover:text-navy-900">
                        <Download className="h-4 w-4" />
                      </button>
                      <button className="rounded-lg p-2 text-gray-400 hover:bg-muted hover:text-navy-900">
                        <Clock className="h-4 w-4" />
                      </button>
                      <button className="rounded-lg p-2 text-gray-400 hover:bg-muted hover:text-red-500">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
