import { useState, useEffect } from "react";
import {
  generateMockTxHash,
  saveMockCredential,
  type MockCredentialInput,
} from "../lib/credentialStore";
import { hashIdentity } from "../lib/hashUtils";

// ============================================================================
// BulkIssueView — V1 mock for batch credential issuance.
// ----------------------------------------------------------------------------
// Demonstrates the "scale" narrative from the pitch deck (slide 7 — AI/OCR).
// Loads a sample CSV template or accepts user-pasted CSV; each row generates
// a hashed mock credential anchored to localStorage with M1 reference.
//
// V2 will replace with real Mesh.js batch transaction + Qwen-VL OCR for
// paper diploma scanning.
// ============================================================================

type Phase = "input" | "preview" | "processing" | "complete";

interface CsvRow {
  recipientName: string;
  recipientEmail: string;
  recipientStudentId: string;
  recipientDob: string;
  credentialTitle: string;
  credentialType: string;
  errors: string[];
}

interface ProcessedRow {
  row: CsvRow;
  status: "queued" | "hashing" | "anchoring" | "done" | "error";
  txHash?: string;
}

const SAMPLE_TEMPLATE = `recipientName,recipientEmail,recipientStudentId,recipientDob,credentialTitle,credentialType
Trần Quốc Huy,huy@vhu.edu.vn,VHU2024001,2003-04-15,Bachelor of Computer Science,Diploma
Nguyễn Thanh Tùng,tung@vhu.edu.vn,VHU2024002,2003-07-22,Bachelor of Computer Science,Diploma
Hoàng Thị Kim Ngân,ngan@vhu.edu.vn,VHU2024003,2003-11-03,Bachelor of Information Technology,Diploma
Trần Minh Nhật,nhat@vhu.edu.vn,VHU2024004,2003-02-18,Bachelor of Software Engineering,Diploma
Lê Hồng Phúc,phuc@vhu.edu.vn,VHU2024005,2003-05-30,Bachelor of Computer Science,Diploma
Phạm Văn Đức,duc@vhu.edu.vn,VHU2024006,2003-09-12,Bachelor of Data Science,Diploma
Đặng Thị Mai,mai@vhu.edu.vn,VHU2024007,2003-12-08,Bachelor of Cybersecurity,Diploma
Vũ Quang Linh,linh@vhu.edu.vn,VHU2024008,2003-03-25,Bachelor of AI,Diploma
Bùi Thị Hương,huong@vhu.edu.vn,VHU2024009,2003-08-14,Bachelor of Computer Science,Diploma
Đỗ Văn Tài,tai@vhu.edu.vn,VHU2024010,2003-06-19,Bachelor of Information Technology,Diploma`;

export default function BulkIssueView({
  onComplete,
}: {
  onComplete: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("input");
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [processed, setProcessed] = useState<ProcessedRow[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [dragActive, setDragActive] = useState(false);

  // ----------------------------------------------------------------------------
  // Phase: input → preview
  // ----------------------------------------------------------------------------
  const parseCsv = (text: string) => {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) return [];
    const headers = lines[0].split(",").map((h) => h.trim());
    const required = [
      "recipientName",
      "credentialTitle",
    ];

    const result: CsvRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v) => v.trim());
      const row: any = {};
      headers.forEach((h, j) => {
        row[h] = values[j] || "";
      });

      const errors: string[] = [];
      for (const r of required) {
        if (!row[r]) errors.push(`Missing ${r}`);
      }

      result.push({
        recipientName: row.recipientName || "",
        recipientEmail: row.recipientEmail || "",
        recipientStudentId: row.recipientStudentId || "",
        recipientDob: row.recipientDob || "",
        credentialTitle: row.credentialTitle || "",
        credentialType: row.credentialType || "Diploma",
        errors,
      });
    }
    return result;
  };

  const loadSample = () => {
    const parsed = parseCsv(SAMPLE_TEMPLATE);
    setRows(parsed);
    setPhase("preview");
  };

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseCsv(text);
      setRows(parsed);
      setPhase("preview");
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith(".csv") || file.type === "text/csv")) {
      handleFile(file);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  // ----------------------------------------------------------------------------
  // Phase: preview → processing → complete
  // ----------------------------------------------------------------------------
  const startProcessing = () => {
    const valid = rows.filter((r) => r.errors.length === 0);
    setProcessed(
      valid.map((row) => ({ row, status: "queued" as const })),
    );
    setActiveIdx(0);
    setPhase("processing");
  };

  // Drive processing animation: 1 row every ~700ms
  useEffect(() => {
    if (phase !== "processing") return;
    if (activeIdx >= processed.length) {
      const t = setTimeout(() => setPhase("complete"), 500);
      return () => clearTimeout(t);
    }

    let cancelled = false;
    const processRow = async () => {
      // Stage 1: hashing
      setProcessed((prev) =>
        prev.map((p, i) =>
          i === activeIdx ? { ...p, status: "hashing" } : p,
        ),
      );
      await new Promise((r) => setTimeout(r, 250));

      const row = processed[activeIdx]?.row;
      if (!row || cancelled) return;

      const [name_hash, student_id_hash, dob_hash] = await Promise.all([
        hashIdentity(row.recipientName),
        row.recipientStudentId ? hashIdentity(row.recipientStudentId) : "",
        row.recipientDob ? hashIdentity(row.recipientDob) : "",
      ]);

      // Stage 2: anchoring
      setProcessed((prev) =>
        prev.map((p, i) =>
          i === activeIdx ? { ...p, status: "anchoring" } : p,
        ),
      );
      await new Promise((r) => setTimeout(r, 350));

      const txHash = generateMockTxHash();
      const credentialInput: MockCredentialInput = {
        recipientName: row.recipientName,
        recipientEmail: row.recipientEmail,
        recipientStudentId: row.recipientStudentId,
        recipientDob: row.recipientDob,
        credentialTitle: row.credentialTitle,
        institution: "Văn Hiến University",
        issueDate: new Date().toISOString().slice(0, 10),
        credentialType: row.credentialType,
        notes: "Bulk-issued via CSV",
        _hashes: { name_hash, student_id_hash, dob_hash },
      };
      saveMockCredential(txHash, credentialInput);

      if (cancelled) return;

      // Stage 3: done
      setProcessed((prev) =>
        prev.map((p, i) =>
          i === activeIdx ? { ...p, status: "done", txHash } : p,
        ),
      );
      await new Promise((r) => setTimeout(r, 100));
      setActiveIdx((i) => i + 1);
    };

    processRow();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIdx, phase]);

  // ----------------------------------------------------------------------------
  // Reset
  // ----------------------------------------------------------------------------
  const reset = () => {
    setPhase("input");
    setRows([]);
    setProcessed([]);
    setActiveIdx(0);
  };

  // ============================================================================
  // RENDER
  // ============================================================================
  if (phase === "input") {
    return (
      <div>
        <div className="flex items-baseline gap-4 mb-2">
          <span className="text-[11px] uppercase tracking-[0.25em] text-black/50">
            № 04 · Bulk issuance
          </span>
          <span className="h-px flex-1 bg-black/20" />
        </div>

        <h1
          className="text-4xl sm:text-5xl md:text-6xl leading-[0.95] mb-4 break-words"
          style={{ fontFamily: "'Instrument Serif', serif", fontWeight: 400 }}
        >
          Issue many credentials
          <br />
          <em className="italic text-[#0033AD]">in one batch</em>.
        </h1>
        <p className="text-sm text-black/60 mb-10 max-w-2xl leading-relaxed">
          Drop a CSV with recipient details. Each row is hashed locally and
          anchored to Cardano via CIP-20 metadata. V2 will integrate Qwen-VL
          OCR to bulk-digitize paper diploma scans.
        </p>

        {/* Dropzone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          className={`border-2 border-black border-dashed bg-white p-10 md:p-16 text-center transition-colors ${
            dragActive ? "bg-[#0033AD]/5 border-[#0033AD]" : ""
          }`}
        >
          <div className="text-5xl mb-4 opacity-30">📄</div>
          <div
            className="text-2xl md:text-3xl mb-3"
            style={{ fontFamily: "'Instrument Serif', serif" }}
          >
            Drop CSV file here
          </div>
          <p className="text-xs text-black/50 mb-6">
            or click to browse — must contain headers: recipientName,
            credentialTitle (others optional)
          </p>

          <label className="inline-block border-2 border-black px-6 py-3 cursor-pointer hover:bg-black hover:text-[#FAFAF7] transition-colors text-[10px] uppercase tracking-[0.2em]">
            Browse file
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileInput}
              className="hidden"
            />
          </label>
        </div>

        {/* Or sample */}
        <div className="mt-6 flex items-center gap-4">
          <span className="h-px flex-1 bg-black/20" />
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-black/40">
            Or
          </span>
          <span className="h-px flex-1 bg-black/20" />
        </div>

        <button
          onClick={loadSample}
          className="w-full mt-6 border-2 border-black bg-white px-6 py-5 text-left hover:bg-black hover:text-[#FAFAF7] transition-colors group"
        >
          <div className="flex items-center justify-between">
            <div>
              <div
                className="text-xl md:text-2xl mb-1"
                style={{ fontFamily: "'Instrument Serif', serif" }}
              >
                Use sample template
              </div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-black/50 group-hover:text-white/70">
                10 mock graduates · Văn Hiến University
              </div>
            </div>
            <span className="text-2xl group-hover:translate-x-1 transition-transform">
              →
            </span>
          </div>
        </button>
      </div>
    );
  }

  if (phase === "preview") {
    const errorCount = rows.filter((r) => r.errors.length > 0).length;
    const validCount = rows.length - errorCount;

    return (
      <div>
        <div className="flex items-baseline gap-4 mb-6">
          <span className="text-[11px] uppercase tracking-[0.25em] text-black/50">
            № 04 · Preview · Bulk issuance
          </span>
          <span className="h-px flex-1 bg-black/20" />
        </div>

        <h1
          className="text-3xl md:text-5xl leading-[0.95] mb-6 break-words"
          style={{ fontFamily: "'Instrument Serif', serif", fontWeight: 400 }}
        >
          {validCount} rows ready
          {errorCount > 0 && (
            <span className="text-[#C53030]"> · {errorCount} errors</span>
          )}
        </h1>

        <div className="border-2 border-black bg-white mb-6 overflow-x-auto">
          <table className="w-full font-mono text-xs">
            <thead className="bg-[#FAFAF7] border-b-2 border-black uppercase tracking-[0.15em] text-black/60">
              <tr>
                <th className="px-4 py-3 text-left">#</th>
                <th className="px-4 py-3 text-left">Recipient</th>
                <th className="px-4 py-3 text-left hidden md:table-cell">
                  Student ID
                </th>
                <th className="px-4 py-3 text-left">Title</th>
                <th className="px-4 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={i}
                  className="border-b border-black/10 last:border-b-0"
                >
                  <td className="px-4 py-3 text-black/40">
                    {String(i + 1).padStart(2, "0")}
                  </td>
                  <td className="px-4 py-3 truncate max-w-[160px]">
                    {row.recipientName}
                  </td>
                  <td className="px-4 py-3 truncate hidden md:table-cell">
                    {row.recipientStudentId}
                  </td>
                  <td className="px-4 py-3 truncate max-w-[200px]">
                    {row.credentialTitle}
                  </td>
                  <td className="px-4 py-3">
                    {row.errors.length > 0 ? (
                      <span
                        className="text-[10px] uppercase tracking-[0.15em]"
                        style={{ color: "#C53030" }}
                      >
                        ✕ {row.errors[0]}
                      </span>
                    ) : (
                      <span
                        className="text-[10px] uppercase tracking-[0.15em]"
                        style={{ color: "#0033AD" }}
                      >
                        ✓ Ready
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <button
            onClick={reset}
            className="border-2 border-black px-6 py-4 text-sm uppercase tracking-[0.2em] hover:bg-black hover:text-[#FAFAF7] transition-colors"
          >
            ← Cancel · Choose another file
          </button>
          <button
            onClick={startProcessing}
            disabled={validCount === 0}
            className="bg-black text-[#FAFAF7] px-6 py-4 text-sm uppercase tracking-[0.2em] hover:bg-[#0033AD] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Process all {validCount} →
          </button>
        </div>
      </div>
    );
  }

  if (phase === "processing") {
    const doneCount = processed.filter((p) => p.status === "done").length;
    const total = processed.length;
    const progress = Math.round((doneCount / total) * 100);

    return (
      <div>
        <div className="flex items-baseline gap-4 mb-6">
          <span className="text-[11px] uppercase tracking-[0.25em] text-[#0033AD]">
            ● Anchoring batch
          </span>
          <span className="h-px flex-1 bg-black/20" />
        </div>

        <h1
          className="text-3xl md:text-5xl leading-[0.95] mb-6 break-words"
          style={{ fontFamily: "'Instrument Serif', serif" }}
        >
          {doneCount} / {total} on-chain
        </h1>

        {/* Progress bar */}
        <div className="border-2 border-black bg-white p-4 mb-6">
          <div className="h-2 bg-black/10 relative overflow-hidden">
            <div
              className="h-full bg-[#0033AD] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between mt-3 font-mono text-[10px] uppercase tracking-[0.2em] text-black/60">
            <span>{progress}%</span>
            <span>~{Math.max(0, total - doneCount)} remaining</span>
          </div>
        </div>

        {/* Live log */}
        <div className="border-2 border-black bg-black text-[#0AFF7F] p-5 font-mono text-[11px] max-h-[400px] overflow-y-auto">
          {processed.map((p, i) => {
            const status = p.status;
            const symbol =
              status === "done"
                ? "✓"
                : status === "anchoring"
                  ? "◉"
                  : status === "hashing"
                    ? "⟳"
                    : "⏸";
            const opacity = status === "queued" ? 0.4 : 1;
            return (
              <div
                key={i}
                style={{ opacity }}
                className="flex items-center gap-3 py-1"
              >
                <span className="w-6 text-center">{symbol}</span>
                <span className="text-white/70 w-8">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="flex-1 truncate text-white">
                  {p.row.recipientName} · {p.row.credentialTitle}
                </span>
                <span className="text-[#0AFF7F]/60 text-[10px]">
                  {status === "done"
                    ? p.txHash?.slice(0, 12) + "..."
                    : status.toUpperCase()}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // phase === "complete"
  const successCount = processed.filter((p) => p.status === "done").length;

  return (
    <div>
      <div className="flex items-baseline gap-4 mb-6">
        <span className="text-[11px] uppercase tracking-[0.25em] text-[#0033AD]">
          ✓ Batch complete
        </span>
        <span className="h-px flex-1 bg-black/20" />
        <span className="text-[10px] uppercase tracking-[0.2em] text-black/40">
          All anchored
        </span>
      </div>

      <h1
        className="text-4xl md:text-6xl leading-[0.95] mb-6 break-words"
        style={{ fontFamily: "'Instrument Serif', serif" }}
      >
        {successCount} credentials.
        <br />
        <em className="italic text-[#0033AD]">All on-chain</em>.
      </h1>

      <p className="text-sm md:text-base text-black/70 mb-10 max-w-2xl leading-relaxed">
        Every recipient now has a verifiable credential anchored to Cardano
        Preprod. They appear immediately in History — share the verifier
        links with employers.
      </p>

      <div className="grid sm:grid-cols-2 gap-3 mb-6">
        <button
          onClick={onComplete}
          className="bg-[#0033AD] text-white px-6 py-5 hover:bg-black transition-colors group"
        >
          <div className="flex items-center justify-between">
            <div className="text-left">
              <div className="text-[10px] uppercase tracking-[0.2em] opacity-70 mb-1">
                Continue
              </div>
              <div
                className="text-base"
                style={{ fontFamily: "'Instrument Serif', serif" }}
              >
                View in History
              </div>
            </div>
            <span className="text-2xl group-hover:translate-x-1 transition-transform">
              →
            </span>
          </div>
        </button>

        <button
          onClick={reset}
          className="border-2 border-black px-6 py-5 hover:bg-black hover:text-[#FAFAF7] transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="text-left">
              <div className="text-[10px] uppercase tracking-[0.2em] opacity-70 mb-1">
                Or
              </div>
              <div
                className="text-base"
                style={{ fontFamily: "'Instrument Serif', serif" }}
              >
                Process another batch
              </div>
            </div>
            <span className="text-2xl">↻</span>
          </div>
        </button>
      </div>

      {/* Tx hash list — collapsed by default */}
      <details className="border-2 border-black bg-white">
        <summary className="px-5 py-3 cursor-pointer font-mono text-[10px] uppercase tracking-[0.2em] text-black/60 hover:text-black">
          ▸ View {successCount} transaction hashes
        </summary>
        <div className="p-5 border-t-2 border-black space-y-2 max-h-[300px] overflow-y-auto">
          {processed
            .filter((p) => p.status === "done")
            .map((p, i) => (
              <div
                key={i}
                className="flex items-center gap-3 font-mono text-[10px]"
              >
                <span className="text-black/40 w-6">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="flex-1 truncate">{p.row.recipientName}</span>
                <code className="text-black/60">
                  {p.txHash?.slice(0, 16)}...
                </code>
                <a
                  href={`/verify/${p.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#0033AD] hover:underline shrink-0"
                >
                  verify ↗
                </a>
              </div>
            ))}
        </div>
      </details>
    </div>
  );
}