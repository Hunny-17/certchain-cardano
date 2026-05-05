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

export default function VerifyResult({
  result,
}: {
  result: VerificationResult;
}) {
  const success = result.isCertChain && result.metadata;
  const meta = result.metadata as (typeof result.metadata & MockExtras) | null;
  const isMock = meta?._isMock === true;
  const anchorTx = meta?._anchorTx ?? M1_ANCHOR_TX;
  const recipientName = meta?._recipientName;
  const recipientEmail = meta?._recipientEmail;
  const notes = meta?._notes;

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
              <Field label="Type" value={result.metadata.credential?.type} />
              <Field
                label={isMock ? "Title" : "Major"}
                value={result.metadata.credential?.major}
              />
              {!isMock && (
                <Field label="GPA" value={result.metadata.credential?.gpa} />
              )}
              <Field
                label={isMock ? "Issue date" : "Graduation"}
                value={result.metadata.credential?.graduation_date}
              />
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

          {!isMock &&
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

          {/* Cardanoscan link — adapts to mock vs real */}
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