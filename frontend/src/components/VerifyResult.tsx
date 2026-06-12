import { useState } from "react";
import type { VerificationResult } from "../lib/blockfrost";

const M1_ANCHOR_TX =
  "fca1ed625512835fab7770da1e9063d394bc75908284c031b591ee49f5250851";

function friendlyError(error: string | undefined): string {
  if (!error) return "Unknown error occurred during verification.";
  const lower = error.toLowerCase();
  if (lower.includes("invalid format") || lower.includes("hexadecimal"))
    return error;
  if (lower.includes("404") || lower.includes("not found")) {
    return "Transaction not found on Cardano Preprod. The hash may be from a different network (mainnet/preview) or never existed.";
  }
  if (
    lower.includes("network") ||
    lower.includes("fetch") ||
    lower.includes("failed to fetch")
  ) {
    return "Network error connecting to Blockfrost. Check your internet and retry.";
  }
  if (lower.includes("metadata")) {
    return "This transaction exists on-chain but has no CertChain metadata. It may be a regular ADA transfer or use a different protocol.";
  }
  return error;
}

// Mock metadata helper — pulls extra fields tớ stash in credentialStore.
// V2 will type these properly when CIP-20 schema is finalized.
type MockExtras = {
  _isMock?: boolean;
  _anchorTx?: string;
  _recipientName?: string;
  _recipientEmail?: string;
  _notes?: string;
};

// Format IPFS / placeholder URIs for display
function formatImageUri(uri: string | undefined): string | null {
  if (!uri) return null;
  if (uri.includes("placeholder")) return null;
  if (uri.startsWith("ipfs://")) {
    return `https://ipfs.io/ipfs/${uri.slice("ipfs://".length)}`;
  }
  return uri;
}

// Format claim_hash for display (truncate to 16 chars)
function formatHash(h: string | undefined): string | undefined {
  if (!h) return undefined;
  if (h.length <= 24) return h;
  return `${h.slice(0, 12)}…${h.slice(-8)}`;
}

export default function VerifyResult({
  result,
}: {
  result: VerificationResult;
}) {
  const success = result.isCertChain && result.metadata;
  const meta = result.metadata as (typeof result.metadata & MockExtras) | null;
  const isMock = meta?._isMock === true;
  const anchorTx = meta?._anchorTx ?? M1_ANCHOR_TX;
  // Recipient name: prefer V1 mock extras, then V2 CIP-25 recipient_name
  const recipientName = meta?._recipientName ?? meta?.recipient_name;
  const recipientEmail = meta?._recipientEmail;
  const notes = meta?._notes;

  // V2 NFT-specific fields (parsed from CIP-25 label 721)
  const assetName = meta?.asset_name;
  const policyId = meta?.policy_id;
  const certType = meta?.cert_type;
  const claimHash = meta?.claim_hash;
  const imageUri = formatImageUri(meta?.image);

  // Detect V2 on-chain mint (has asset_name but not mock)
  const isV2OnChain = !isMock && !!assetName;

  const downloadFilename = assetName ?? "credential-original";
  const [downloadState, setDownloadState] = useState<"idle" | "loading" | "error">("idle");
  const [receiptState, setReceiptState] = useState<"idle" | "loading" | "error">("idle");
  const [receiptWarning, setReceiptWarning] = useState("");

  async function handleDownloadReceipt() {
    if (!result.metadata) return;
    setReceiptState("loading");
    setReceiptWarning("");
    try {
      const { generateReceipt } = await import("../lib/receipt-pdf");
      const network = (import.meta.env.VITE_NETWORK ?? "preprod") as "preprod" | "mainnet";
      const cardanoscanBase =
        network === "preprod"
          ? "https://preprod.cardanoscan.io/transaction/"
          : "https://cardanoscan.io/transaction/";
      const { pdfBytes, vietnameseSupport } = await generateReceipt({
        txHash: result.txHash,
        policyId: policyId,
        assetName: assetName,
        recipientName: recipientName,
        certTitle: result.metadata.credential?.major,
        certType: certType,
        institution: result.metadata.issuer?.name ?? result.metadata.issuer?.id,
        issueDate: result.metadata.credential?.graduation_date,
        verifiedAt: new Date(),
        network,
        cardanoscanUrl: `${cardanoscanBase}${result.txHash}`,
        certchainVerifyUrl: `${window.location.origin}/verify/${result.txHash}`,
      });
      if (!vietnameseSupport) {
        setReceiptWarning("Font unavailable — Vietnamese characters may not display correctly.");
      }
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `certchain-receipt-${result.txHash.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setReceiptState("idle");
    } catch {
      setReceiptState("error");
    }
  }

  async function handleDownload() {
    if (!imageUri) return;
    setDownloadState("loading");
    try {
      const res = await fetch(imageUri);
      if (!res.ok) throw new Error("fetch failed");
      const blob = await res.blob();
      let ext = "";
      if (blob.type.includes("pdf")) ext = ".pdf";
      else if (blob.type.includes("png")) ext = ".png";
      else if (blob.type.includes("jpeg")) ext = ".jpg";
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objUrl;
      a.download = downloadFilename + ext;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objUrl);
      setDownloadState("idle");
    } catch {
      setDownloadState("error");
    }
  }

  return (
    <div className="mt-12">
      {/* Mock badge — only for V1 mock credentials */}
      {success && isMock && (
        <div
          className="border border-b-0 border-ink px-6 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2"
          style={{ background: "#FFF4D6" }}
        >
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] flex items-center gap-3">
            <span
              className="inline-block w-2 h-2"
              style={{ background: "#B8860B" }}
            />
            <span>MOCK V1 · Local issuance demo</span>
          </div>
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
            Anchored via M1 · {anchorTx.slice(0, 12)}...{anchorTx.slice(-6)}
          </div>
        </div>
      )}

      {/* V2 on-chain badge */}
      {success && isV2OnChain && (
        <div
          className="border border-b-0 border-ink px-6 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2"
          style={{ background: "#E8F5E9" }}
        >
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] flex items-center gap-3">
            <span
              className="inline-block w-2 h-2"
              style={{ background: "#00C853" }}
            />
            <span>V2 ON-CHAIN NFT · CIP-25 metadata</span>
          </div>
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
            Asset · {assetName}
          </div>
        </div>
      )}

      {/* Status card */}
      <div
        className={`border border-ink p-6 relative ${success ? "" : "bg-bg-secondary"}`}
        style={success ? { background: "#0033AD", color: "#FAFAF7" } : {}}
      >
        {!success && (
          <div
            className="absolute top-0 left-0 right-0 h-1"
            style={{ background: "#C53030" }}
          />
        )}
        <div className="font-mono text-xs uppercase tracking-widest opacity-70 mb-3">
          {success ? "✓ VERIFICATION PASSED" : "✕ VERIFICATION FAILED"}
        </div>
        <h3 className="font-serif text-3xl md:text-4xl leading-tight">
          {success ? "Authentic credential." : "Cannot verify this hash."}
        </h3>
        {success && recipientName && (
          <div className="mt-4 font-mono text-xs uppercase tracking-[0.2em] opacity-80">
            Issued to · <span className="font-sans normal-case text-base ml-1">{recipientName}</span>
          </div>
        )}
        {success && !recipientName && isV2OnChain && result.metadata?.credential?.major && (
          <div className="mt-4 font-mono text-xs uppercase tracking-[0.2em] opacity-80">
            Credential · <span className="font-sans normal-case text-base ml-1">{result.metadata.credential.major}</span>
          </div>
        )}
        {!success && (
          <>
            <p className="font-mono text-xs text-ink-muted mt-3 leading-relaxed max-w-xl">
              {friendlyError(result.error)}
            </p>
            <div className="mt-6 pt-4 border-t border-ink/20 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                Hash queried · {result.txHash.slice(0, 16)}...
                {result.txHash.slice(-8)}
              </span>
              <a
                href={`/verify/${M1_ANCHOR_TX}`}
                className="font-mono text-[10px] uppercase tracking-[0.2em] underline underline-offset-4 hover:text-cardano-blue transition-colors shrink-0"
              >
                → Try our M1 demo credential
              </a>
            </div>
          </>
        )}
      </div>

      {success && result.metadata && (
        <div className="border-x border-b border-ink">
          <div className="border-b border-ink p-6">
            <div className="font-mono text-xs uppercase tracking-widest text-ink-muted mb-6">
              [01] / Credential Details
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              {recipientName && (
                <Field label="Recipient" value={recipientName} />
              )}
              {recipientEmail && (
                <Field label="Email" value={recipientEmail} />
              )}
              <Field
                label="Issuer"
                value={
                  result.metadata.issuer?.name || result.metadata.issuer?.id
                }
              />
              <Field
                label="Type"
                value={result.metadata.credential?.type || certType}
              />
              <Field
                label={isMock ? "Title" : "Title / Major"}
                value={result.metadata.credential?.major}
              />
              {!isMock && !isV2OnChain && (
                <Field label="GPA" value={result.metadata.credential?.gpa} />
              )}
              {result.metadata.credential?.graduation_date && (
                <Field
                  label={isMock ? "Issue date" : "Graduation"}
                  value={result.metadata.credential.graduation_date}
                />
              )}
              {result.blockTime && (
                <Field
                  label={isMock ? "Issued at (local)" : "On-chain at"}
                  value={new Date(result.blockTime * 1000).toLocaleString(
                    "en-US",
                  )}
                />
              )}
              {notes && <Field label="Notes" value={notes} />}
            </div>
          </div>

          {/* V2 — CIP-25 NFT details */}
          {isV2OnChain && (
            <div className="border-b border-ink p-6 bg-bg-secondary">
              <div className="font-mono text-xs uppercase tracking-widest text-ink-muted mb-4">
                [02] / On-Chain NFT (CIP-25)
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                {assetName && <Field label="Asset name" value={assetName} />}
                {policyId && (
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-2">
                      Policy ID
                    </div>
                    <code className="block font-mono text-xs break-all bg-ink text-bg p-2">
                      {policyId}
                    </code>
                  </div>
                )}
                {claimHash && (
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-2">
                      Claim hash
                    </div>
                    <code className="block font-mono text-xs break-all bg-ink text-bg p-2">
                      {formatHash(claimHash)}
                    </code>
                  </div>
                )}
                {imageUri && (
                  <div className="md:col-span-2">
                    <div className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-2">
                      Original Document
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <a
                        href={imageUri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-xs underline underline-offset-4 hover:text-cardano-blue truncate"
                      >
                        {imageUri}
                      </a>
                      <button
                        type="button"
                        onClick={handleDownload}
                        disabled={downloadState === "loading"}
                        className="shrink-0 border border-ink font-mono text-xs uppercase tracking-[0.2em] px-4 py-2 hover:bg-ink hover:text-bg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {downloadState === "loading" ? "Downloading..." : "↓ Download original"}
                      </button>
                    </div>
                    {downloadState === "error" && (
                      <p className="font-mono text-[10px] text-red-600 mt-2">
                        Download failed — open link manually ↑
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {!isMock &&
            !isV2OnChain &&
            (result.metadata.credential?.name_hash ||
              result.metadata.credential?.student_id_hash ||
              result.metadata.credential?.doc_hash) && (
              <div className="border-b border-ink p-6 bg-bg-secondary">
                <div className="font-mono text-xs uppercase tracking-widest text-ink-muted mb-4">
                  [02] / SHA-256 Hashes (Privacy-Preserving)
                </div>
                <div className="space-y-3">
                  {result.metadata.credential?.name_hash && (
                    <HashRow
                      label="name_hash"
                      value={result.metadata.credential.name_hash}
                    />
                  )}
                  {result.metadata.credential?.student_id_hash && (
                    <HashRow
                      label="student_id_hash"
                      value={result.metadata.credential.student_id_hash}
                    />
                  )}
                  {result.metadata.credential?.doc_hash && (
                    <HashRow
                      label="doc_hash"
                      value={result.metadata.credential.doc_hash}
                    />
                  )}
                </div>
              </div>
            )}

          {/* Bottom actions: Receipt + Cardanoscan */}
          <div className="border-t border-ink">
            {/* Download Receipt — only for real on-chain credentials */}
            {!isMock && (
              <div className="border-b border-ink p-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <button
                    type="button"
                    onClick={handleDownloadReceipt}
                    disabled={receiptState === "loading"}
                    className="shrink-0 border border-ink font-mono text-xs uppercase tracking-[0.2em] px-4 py-2 hover:bg-ink hover:text-bg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {receiptState === "loading" ? "Generating..." : "↓ Download Receipt PDF"}
                  </button>
                  <span className="font-mono text-[10px] text-ink-muted">
                    {receiptState === "error"
                      ? "Generation failed — try again."
                      : receiptWarning
                        ? receiptWarning
                        : "Verification record for HR, compliance, or audit."}
                  </span>
                </div>
              </div>
            )}
            {/* Cardanoscan link */}
            {isMock ? (
              <a
                href={`https://preprod.cardanoscan.io/transaction/${anchorTx}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-4 font-mono text-xs uppercase tracking-widest text-center hover:bg-ink hover:text-bg transition-colors"
              >
                → view anchor proof (M1) on cardanoscan ↗
              </a>
            ) : (
              <a
                href={`https://preprod.cardanoscan.io/transaction/${result.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-4 font-mono text-xs uppercase tracking-widest text-center hover:bg-ink hover:text-bg transition-colors"
              >
                → view full transaction on cardanoscan ↗
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-2">
        {label}
      </div>
      <div className="text-base">
        {value || <span className="text-ink-muted">—</span>}
      </div>
    </div>
  );
}

function HashRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-1">
        {label}
      </div>
      <code className="block font-mono text-xs break-all bg-ink text-bg p-3">
        {value}
      </code>
    </div>
  );
}