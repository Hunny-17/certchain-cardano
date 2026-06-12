import { useState, useEffect, useRef } from "react";
import { mintCertificate } from "../lib/mintApi";

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
  institution: string;
  issue_date: string;
  errors: string[];
}

interface ProcessedRow {
  row: CsvRow;
  status: "queued" | "submitting" | "done" | "error";
  txHash?: string;
  errorMessage?: string;
}

const SAMPLE_TEMPLATE = `recipientName,recipientEmail,recipientStudentId,recipientDob,credentialTitle,credentialType,institution,issue_date
Trần Quốc Huy,huy@vhu.edu.vn,VHU2024001,2003-04-15,Bachelor of Computer Science,Diploma,Văn Hiến University,2026-06-12
Nguyễn Thanh Tùng,tung@vhu.edu.vn,VHU2024002,2003-07-22,Bachelor of Computer Science,Diploma,Văn Hiến University,2026-06-12
Hoàng Thị Kim Ngân,ngan@vhu.edu.vn,VHU2024003,2003-11-03,Bachelor of Information Technology,Diploma,Văn Hiến University,2026-06-12
Trần Minh Nhật,nhat@vhu.edu.vn,VHU2024004,2003-02-18,Bachelor of Software Engineering,Diploma,Văn Hiến University,2026-06-12
Lê Hồng Phúc,phuc@vhu.edu.vn,VHU2024005,2003-05-30,Bachelor of Computer Science,Diploma,Văn Hiến University,2026-06-12
Phạm Văn Đức,duc@vhu.edu.vn,VHU2024006,2003-09-12,Bachelor of Data Science,Diploma,Văn Hiến University,2026-06-12
Đặng Thị Mai,mai@vhu.edu.vn,VHU2024007,2003-12-08,Bachelor of Cybersecurity,Diploma,Văn Hiến University,2026-06-12
Vũ Quang Linh,linh@vhu.edu.vn,VHU2024008,2003-03-25,Bachelor of AI,Diploma,Văn Hiến University,2026-06-12
Bùi Thị Hương,huong@vhu.edu.vn,VHU2024009,2003-08-14,Bachelor of Computer Science,Diploma,Văn Hiến University,2026-06-12
Đỗ Văn Tài,tai@vhu.edu.vn,VHU2024010,2003-06-19,Bachelor of Information Technology,Diploma,Văn Hiến University,2026-06-12`;

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
  const abortRef = useRef(false);
  const [isAborting, setIsAborting] = useState(false);
  const processingStartRef = useRef<number>(0);

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
      "institution",
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
        institution: row.institution || "",
        issue_date: row.issue_date || new Date().toISOString().slice(0, 10),
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
    abortRef.current = false;
    setIsAborting(false);
    processingStartRef.current = Date.now();
    const valid = rows.filter((r) => r.errors.length === 0);
    setProcessed(
      valid.map((row) => ({ row, status: "queued" as const })),
    );
    setActiveIdx(0);
    setPhase("processing");
  };

  useEffect(() => {
    if (phase !== "processing") return;

    // Abort: current row already finished (effect ran after setActiveIdx),
    // stop before starting the next one. Don't cancel in-flight txs.
    if (abortRef.current) {
      abortRef.current = false;
      setIsAborting(false);
      setPhase("complete");
      return;
    }

    if (activeIdx >= processed.length) {
      const t = setTimeout(() => setPhase("complete"), 500);
      return () => clearTimeout(t);
    }

    // Skip already-done rows (happens on retry pass)
    if (processed[activeIdx]?.status === "done") {
      setActiveIdx((i) => i + 1);
      return;
    }

    let cancelled = false;
    const processRow = async () => {
      const row = processed[activeIdx]?.row;
      if (!row || cancelled) return;

      setProcessed((prev) =>
        prev.map((p, i) =>
          i === activeIdx ? { ...p, status: "submitting" } : p,
        ),
      );

      try {
        const result = await mintCertificate({
          recipient_name: row.recipientName,
          recipient_email:
            row.recipientEmail ||
            `${row.recipientName.toLowerCase().replace(/\s+/g, ".")}@unknown.local`,
          cert_title: row.credentialTitle,
          institution: row.institution,
          issue_date: row.issue_date,
          cert_type: row.credentialType || "Diploma",
          notes: "Bulk-issued via CSV",
        });

        if (cancelled) return;
        setProcessed((prev) =>
          prev.map((p, i) =>
            i === activeIdx ? { ...p, status: "done", txHash: result.tx_hash } : p,
          ),
        );
      } catch (e: unknown) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : "Mint failed";
        setProcessed((prev) =>
          prev.map((p, i) =>
            i === activeIdx ? { ...p, status: "error", errorMessage: msg } : p,
          ),
        );
      }

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
    abortRef.current = false;
    setIsAborting(false);
    setPhase("input");
    setRows([]);
    setProcessed([]);
    setActiveIdx(0);
  };

  const handleRetry = () => {
    abortRef.current = false;
    setIsAborting(false);
    processingStartRef.current = Date.now();
    setProcessed((prev) =>
      prev.map((p) =>
        p.status === "error"
          ? { ...p, status: "queued" as const, txHash: undefined, errorMessage: undefined }
          : p,
      ),
    );
    setActiveIdx(0);
    setPhase("processing");
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
    const errorInProgress = processed.filter((p) => p.status === "error").length;
    const settledCount = doneCount + errorInProgress;
    const queuedCount = processed.filter((p) => p.status === "queued").length;
    const total = processed.length;
    const progress = Math.round((settledCount / total) * 100);

    // Adaptive ETA: use actual avg after 2 settled rows, else fixed 65s/row
    const SECONDS_PER_MINT = 65;
    let etaText: string;
    if (settledCount >= 2 && processingStartRef.current > 0) {
      const elapsed = (Date.now() - processingStartRef.current) / 1000;
      const avgPerRow = elapsed / settledCount;
      const etaSecs = Math.round(queuedCount * avgPerRow);
      etaText = queuedCount === 0 ? "Almost done" : etaSecs < 60 ? `~${etaSecs}s` : `~${Math.ceil(etaSecs / 60)} min`;
    } else {
      const etaSecs = queuedCount * SECONDS_PER_MINT;
      etaText = queuedCount === 0 ? "Almost done" : etaSecs < 60 ? `~${etaSecs}s` : `~${Math.ceil(etaSecs / 60)} min`;
    }

    return (
      <div>
        <div className="flex items-baseline gap-4 mb-6">
          <span className="text-[11px] uppercase tracking-[0.25em] text-[#0033AD]">
            {isAborting ? "⊙ Aborting after current row..." : "● Anchoring batch"}
          </span>
          <span className="h-px flex-1 bg-black/20" />
        </div>

        <h1
          className="text-3xl md:text-5xl leading-[0.95] mb-6 break-words"
          style={{ fontFamily: "'Instrument Serif', serif" }}
        >
          {doneCount} / {total} on-chain
          {errorInProgress > 0 && (
            <span className="text-[#C53030]"> · {errorInProgress} failed</span>
          )}
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
            <span>{etaText}</span>
          </div>
        </div>

        {/* Live log */}
        <div className="border-2 border-black bg-black text-[#0AFF7F] p-5 font-mono text-[11px] max-h-[400px] overflow-y-auto">
          {processed.map((p, i) => {
            const status = p.status;
            const symbol =
              status === "done"
                ? "✓"
                : status === "error"
                  ? "✕"
                  : status === "submitting"
                    ? "◉"
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
                    : status === "error"
                      ? p.errorMessage?.slice(0, 24) + "…"
                      : status.toUpperCase()}
                </span>
              </div>
            );
          })}
        </div>

        {/* Abort button */}
        <div className="mt-4">
          <button
            type="button"
            onClick={() => {
              abortRef.current = true;
              setIsAborting(true);
            }}
            disabled={isAborting}
            className="border border-black/30 px-5 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-black/50 hover:border-[#C53030] hover:text-[#C53030] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isAborting ? "Waiting for current row to finish..." : "✕ Abort batch"}
          </button>
        </div>
      </div>
    );
  }

  // phase === "complete"
  const successCount = processed.filter((p) => p.status === "done").length;
  const errorCount = processed.filter((p) => p.status === "error").length;

  return (
    <div>
      <div className="flex items-baseline gap-4 mb-6">
        <span
          className={`text-[11px] uppercase tracking-[0.25em] ${errorCount > 0 ? "text-[#C53030]" : "text-[#0033AD]"}`}
        >
          {errorCount > 0 ? "⚠ Batch done with errors" : "✓ Batch complete"}
        </span>
        <span className="h-px flex-1 bg-black/20" />
        <span className="text-[10px] uppercase tracking-[0.2em] text-black/40">
          {errorCount === 0 ? "All anchored" : `${successCount} anchored · ${errorCount} failed`}
        </span>
      </div>

      <h1
        className="text-4xl md:text-6xl leading-[0.95] mb-6 break-words"
        style={{ fontFamily: "'Instrument Serif', serif" }}
      >
        {successCount} minted.
        {errorCount > 0 && (
          <span className="text-[#C53030]"> {errorCount} failed.</span>
        )}
        <br />
        <em className="italic text-[#0033AD]">
          {errorCount === 0 ? "All on-chain" : "Check errors below"}
        </em>.
      </h1>

      <p className="text-sm md:text-base text-black/70 mb-6 max-w-2xl leading-relaxed">
        {errorCount === 0
          ? "Every recipient now has a verifiable credential anchored to Cardano Preprod. Share the verifier links with employers."
          : `${successCount} credentials anchored. ${errorCount} row(s) failed — see details below and retry.`}
      </p>

      {errorCount > 0 && (
        <>
          <button
            type="button"
            onClick={handleRetry}
            className="w-full mb-4 border-2 border-[#C53030] text-[#C53030] px-6 py-4 font-mono text-sm uppercase tracking-[0.2em] hover:bg-[#C53030] hover:text-white transition-colors"
          >
            ↻ Retry {errorCount} failed row{errorCount > 1 ? "s" : ""}
          </button>
          <details className="border-2 border-[#C53030]/40 bg-white mb-6">
            <summary className="px-5 py-3 cursor-pointer font-mono text-[10px] uppercase tracking-[0.2em] text-[#C53030]/70 hover:text-[#C53030]">
              ▸ {errorCount} failed row{errorCount > 1 ? "s" : ""} — details
            </summary>
            <div className="p-5 border-t border-[#C53030]/20 space-y-3 max-h-[240px] overflow-y-auto">
              {processed
                .filter((p) => p.status === "error")
                .map((p, i) => (
                  <div key={i} className="font-mono text-xs">
                    <div className="text-black">{p.row.recipientName} · {p.row.credentialTitle}</div>
                    <div className="text-[#C53030] text-[10px] mt-0.5">{p.errorMessage}</div>
                  </div>
                ))}
            </div>
          </details>
        </>
      )}

      <div className="grid sm:grid-cols-2 gap-3 mb-6">
        <button
          type="button"
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
          type="button"
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