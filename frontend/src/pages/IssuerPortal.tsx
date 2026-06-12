import { useState, useEffect } from "react";
import type { ChangeEvent, SyntheticEvent } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Link } from "react-router-dom";
import {
  saveMockCredential,
  listMockCredentials,
  type StoredMockCredential,
} from "../lib/credentialStore";
import { useUserRole } from "../lib/useUserRole";
import RoleBadge from "../components/RoleBadge";
import { hashIdentity } from "../lib/hashUtils";
import BulkIssueView from "../components/BulkIssueView";
import IpfsUpload from "../components/IpfsUpload";
import { mintCertificate } from "../lib/mintApi";
// ============================================================================
// CertChain — Issuer Portal (Mock)
// ----------------------------------------------------------------------------
// V1 demo: form → fake publish (3 steps) → QR + txHash + verifier link
// txHash hardcoded to M1 POC tx; swap with real Mesh.js publish in V2.
// Style: brutalist editorial light — match Landing/Verifier from Day 2.
// ============================================================================

type Phase = "idle" | "publishing" | "success" | "history" | "bulk";

interface FormState {
  recipientName: string;
  recipientEmail: string;
  recipientStudentId: string;
  recipientDob: string;
  credentialTitle: string;
  institution: string;
  issueDate: string;
  credentialType: string;
  notes: string;
}

interface PublishStep {
  id: number;
  label: string;
  detail: string;
}

const PUBLISH_STEPS: PublishStep[] = [
  {
    id: 1,
    label: "Building mint transaction",
    detail: "Mesh.js · CIP-25 + CIP-20 metadata",
  },
  {
    id: 2,
    label: "Signing with custody wallet",
    detail: "Ed25519 · single-sig forge script",
  },
  {
    id: 3,
    label: "Submitting to Cardano Preprod",
    detail: "Blockfrost · ~30s confirmation",
  },
];

const CREDENTIAL_TYPES = [
  "Diploma",
  "Certificate",
  "Award",
  "Course Completion",
  "Professional License",
];

const initialForm: FormState = {
  recipientName: "",
  recipientEmail: "",
  recipientStudentId: "",
  recipientDob: "",
  credentialTitle: "",
  institution: " University",
  issueDate: new Date().toISOString().slice(0, 10),
  credentialType: "Diploma",
  notes: "",
};

type FieldChangeEvent = ChangeEvent<
  HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
>;

export default function IssuerPortal() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [activeStep, setActiveStep] = useState(0);
  const [form, setForm] = useState<FormState>(initialForm);
  const [currentTxHash, setCurrentTxHash] = useState<string>("");
  const [claimCode, setClaimCode] = useState<string>("");
  const [mintError, setMintError] = useState<string>("");
  const [ipfsHash, setIpfsHash] = useState<string>("");
  const userRole = useUserRole();

  const handleChange = (key: keyof FormState) => (e: FieldChangeEvent) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handlePublish = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!form.recipientName || !form.credentialTitle) return;

    setMintError("");
    setPhase("publishing");
    setActiveStep(0);

    // Animate step progression while waiting for API
    const stepTimer = setInterval(() => {
      setActiveStep((s) => Math.min(s + 1, PUBLISH_STEPS.length - 1));
    }, 8000); // advance every 8s, capped at last step

    try {
      // Generate PII hashes for V3 anchoring (V2 stores in Supabase only)
      const [name_hash, student_id_hash, dob_hash] = await Promise.all([
        hashIdentity(form.recipientName),
        form.recipientStudentId ? hashIdentity(form.recipientStudentId) : "",
        form.recipientDob ? hashIdentity(form.recipientDob) : "",
      ]);

      // Call real mint API
      const hp = (e.currentTarget.elements.namedItem("website") as HTMLInputElement | null)?.value ?? "";
      const result = await mintCertificate({
        recipient_email:
          form.recipientEmail ||
          `${form.recipientName.toLowerCase().replace(/\s+/g, ".")}@unknown.local`,
        recipient_name: form.recipientName,
        cert_title: form.credentialTitle,
        institution: form.institution,
        issue_date: form.issueDate,
        cert_type: form.credentialType,
        notes: form.notes || undefined,
        ipfs_hash: ipfsHash || undefined,
        _hp: hp,
      });

      clearInterval(stepTimer);
      setActiveStep(PUBLISH_STEPS.length); // mark all done

      // Save to localStorage for legacy history view compatibility
      saveMockCredential(result.tx_hash, {
        ...form,
        _hashes: { name_hash, student_id_hash, dob_hash },
        _real: true,
        _claimCodeShown: true,
        _assetId: result.asset_id,
      } as any);

      setCurrentTxHash(result.tx_hash);
      setClaimCode(result.claim_code);

      // Short delay so users see "all steps complete" before success view
      setTimeout(() => setPhase("success"), 600);
    } catch (err: unknown) {
      clearInterval(stepTimer);
      const message = err instanceof Error ? err.message : String(err);
      setMintError(message);
      setPhase("idle"); // go back to form, error shown above it
    }
  };

  const reset = () => {
    setPhase("idle");
    setActiveStep(0);
    setForm(initialForm);
    setCurrentTxHash("");
    setClaimCode("");
    setMintError("");
    setIpfsHash("");
  };

  const verifyUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/verify/${currentTxHash}`
      : `https://certchain.app/verify/${currentTxHash}`;

  return (
    <div className="min-h-screen bg-[#FAFAF7] text-black font-mono">
      {/* ================= NAV ================= */}
      <header className="border-b-2 border-black">
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-5 flex items-center justify-between">
          <a href="/" className="flex items-baseline gap-3">
            <span
              className="text-2xl tracking-tight"
              style={{ fontFamily: "'Instrument Serif', serif" }}
            >
              CertChain
            </span>
            <span className="text-[10px] uppercase tracking-[0.2em] text-black/50">
              · Cardano
            </span>
          </a>
          <nav className="flex items-center gap-6 text-[11px] uppercase tracking-[0.15em]">
            <span className="text-black/40">Issuer</span>
            <span className="text-black/20">/</span>
            <span>New Credential</span>
          </nav>
        </div>
      </header>
      <RoleBadge role={userRole} />
      {/* ================= MAIN ================= */}
      <main className="max-w-7xl mx-auto px-6 md:px-10 py-12 md:py-16">
        {/* Tab switcher — only show in idle/history phases */}
        {(phase === "idle" || phase === "bulk" || phase === "history") && (
          <TabSwitcher phase={phase} setPhase={setPhase} />
        )}

        <div key={phase} className="phase-enter">
          {phase === "idle" && (
            <IdleView
              form={form}
              handleChange={handleChange}
              handlePublish={handlePublish}
              mintError={mintError}
              ipfsHash={ipfsHash}
              onIpfsChange={setIpfsHash}
            />
          )}
          {phase === "publishing" && (
            <PublishingView form={form} activeStep={activeStep} />
          )}
          {phase === "success" && (
            <SuccessView
              form={form}
              txHash={currentTxHash}
              claimCode={claimCode}
              verifyUrl={verifyUrl}
              onReset={reset}
            />
          )}
          {phase === "history" && <HistoryView setPhase={setPhase} />}
          {phase === "bulk" && (
            <BulkIssueView onComplete={() => setPhase("history")} />
          )}
        </div>
      </main>

      {/* ================= STATUS BAR ================= */}
      <footer className="border-t-2 border-black mt-20">
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-3 flex items-center justify-between text-[10px] uppercase tracking-[0.2em]">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 bg-[#0033AD] inline-block" />
              Preprod Network
            </span>
            <span className="text-black/40">Slot 47,283,910</span>
            <span className="text-black/40 hidden md:inline">
              Latest block · 12s ago
            </span>
          </div>
          <span className="text-black/40">Mesh.js v1.8 · Real mint</span>
        </div>
      </footer>
      <style>{`
        @keyframes phase-enter {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .phase-enter {
          animation: phase-enter 400ms ease-out;
        }
        @keyframes step-enter {
          from {
            opacity: 0;
            transform: translateX(-12px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .step-enter {
          animation: step-enter 350ms ease-out backwards;
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// IDLE — form input
// ============================================================================
interface IdleViewProps {
  form: FormState;
  handleChange: (key: keyof FormState) => (e: FieldChangeEvent) => void;
  handlePublish: (e: SyntheticEvent<HTMLFormElement>) => void;
  mintError?: string;
  ipfsHash: string;
  onIpfsChange: (hash: string) => void;
}

function IdleView({
  form,
  handleChange,
  handlePublish,
  mintError,
  ipfsHash,
  onIpfsChange,
}: IdleViewProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16">
      {/* LEFT — Form */}
      <section className="lg:col-span-7">
        <div className="flex items-baseline gap-4 mb-2">
          <span className="text-[11px] uppercase tracking-[0.25em] text-black/50">
            № 001
          </span>
          <span className="h-px flex-1 bg-black/20" />
        </div>

        <h1
          className="text-5xl md:text-7xl leading-[0.95] mb-4"
          style={{ fontFamily: "'Instrument Serif', serif", fontWeight: 400 }}
        >
          Issue a new
          <br />
          <em className="italic text-[#0033AD]">credential</em>.
        </h1>
        <p className="text-sm text-black/60 mb-12 max-w-md leading-relaxed">
          Fill in the recipient and credential details. The hash is anchored on
          Cardano Preprod via CIP-20 metadata. Verification is permanent.
        </p>
        {mintError && (
          <div className="border-2 border-red-600 bg-red-50 p-4 mb-8">
            <div className="text-[10px] uppercase tracking-[0.2em] text-red-700 mb-1">
              ✗ Mint Failed
            </div>
            <div className="text-sm text-red-900 font-mono break-words">
              {mintError}
            </div>
          </div>
        )}
        <form onSubmit={handlePublish} className="space-y-8">
          <Field
            label="Recipient · Full Name"
            required
            value={form.recipientName}
            onChange={handleChange("recipientName")}
            placeholder="Nguyễn Văn A"
          />
          <Field
            label="Recipient · Email"
            type="email"
            value={form.recipientEmail}
            onChange={handleChange("recipientEmail")}
            placeholder="recipient@example.com"
          />

          {/* Identity verification fields — hashed on-chain, never plaintext */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Field
              label="Student ID · Hashed"
              value={form.recipientStudentId}
              onChange={handleChange("recipientStudentId")}
              placeholder="VHU2024001"
            />
            <Field
              label="Date of Birth · Hashed"
              type="date"
              value={form.recipientDob}
              onChange={handleChange("recipientDob")}
            />
          </div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-black/50 -mt-4">
            ↑ SHA-256 hashed on-chain · plaintext never anchored ·
            privacy-preserving
          </p>

          <Field
            label="Credential · Title"
            required
            value={form.credentialTitle}
            onChange={handleChange("credentialTitle")}
            placeholder="Bachelor of Computer Science"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Field
              label="Issuing Institution"
              value={form.institution}
              onChange={handleChange("institution")}
            />
            <Field
              label="Issue Date"
              type="date"
              value={form.issueDate}
              onChange={handleChange("issueDate")}
            />
          </div>

          <div>
            <label
              htmlFor="credential-type"
              className="block text-[11px] uppercase tracking-[0.2em] text-black/60 mb-2"
            >
              Credential Type
            </label>
            <select
              id="credential-type"
              value={form.credentialType}
              onChange={handleChange("credentialType")}
              className="w-full bg-transparent border-b-2 border-black py-3 text-base font-mono focus:outline-none focus:border-[#0033AD] cursor-pointer"
            >
              {CREDENTIAL_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-[0.2em] text-black/60 mb-2">
              Certificate file{" "}
              <span className="text-black/30 normal-case">(optional · PDF or image)</span>
            </label>
            <IpfsUpload
              currentHash={ipfsHash}
              onUpload={onIpfsChange}
              onClear={() => onIpfsChange("")}
            />
          </div>

          <div>
            <label
              htmlFor="notes"
              className="block text-[11px] uppercase tracking-[0.2em] text-black/60 mb-2"
            >
              Notes{" "}
              <span className="text-black/30 normal-case">(optional)</span>
            </label>
            <textarea
              id="notes"
              value={form.notes}
              onChange={handleChange("notes")}
              rows={3}
              placeholder="Honors, GPA, special distinctions..."
              className="w-full bg-transparent border-2 border-black p-4 text-sm font-mono focus:outline-none focus:border-[#0033AD] resize-none"
            />
          </div>

          <div className="pt-6 border-t-2 border-black flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <p className="text-[11px] uppercase tracking-[0.15em] text-black/50 max-w-xs leading-relaxed">
              By publishing you consent to recording a metadata hash on the
              Cardano blockchain. This action is irreversible.
            </p>
            {mintError && <p className="text-red-500 text-sm">{mintError}</p>}
            {/* Honeypot — hidden from humans via CSS, bots auto-fill it */}
            <input
              type="text"
              name="website"
              tabIndex={-1}
              aria-hidden="true"
              autoComplete="off"
              style={{ position: "absolute", left: "-9999px", opacity: 0 }}
            />
            <button
              type="submit"
              className="group relative bg-black text-[#FAFAF7] px-10 py-5 text-sm uppercase tracking-[0.2em] hover:bg-[#0033AD] transition-colors duration-200 border-2 border-black"
            >
              Publish to Cardano →
            </button>
          </div>
        </form>
      </section>

      {/* RIGHT — Preview card */}
      <aside className="lg:col-span-5">
        <div className="lg:sticky lg:top-12">
          <div className="flex items-baseline gap-3 mb-4">
            <span className="text-[10px] uppercase tracking-[0.25em] text-black/50">
              Live Preview
            </span>
            <span className="h-px flex-1 bg-black/20" />
          </div>
          <CredentialCard form={form} />
          <MetaPanel form={form} />
        </div>
      </aside>
    </div>
  );
}

// ============================================================================
// PUBLISHING — fake 3-step animation
// ============================================================================
interface PublishingViewProps {
  form: FormState;
  activeStep: number;
}

function PublishingView({ form, activeStep }: PublishingViewProps) {
  return (
    <div className="max-w-3xl mx-auto py-12">
      <div className="flex items-baseline gap-4 mb-6">
        <span className="text-[11px] uppercase tracking-[0.25em] text-[#0033AD]">
          ● Publishing
        </span>
        <span className="h-px flex-1 bg-black/20" />
      </div>

      <h1
        className="text-4xl md:text-6xl leading-[0.95] mb-12"
        style={{ fontFamily: "'Instrument Serif', serif" }}
      >
        Anchoring on
        <br />
        <em className="italic text-[#0033AD]">Cardano Preprod</em>...
      </h1>

      <div className="space-y-1 border-2 border-black bg-white">
        {PUBLISH_STEPS.map((step, idx) => {
          const status =
            idx < activeStep
              ? "done"
              : idx === activeStep
                ? "active"
                : "pending";
          return (
            <div
              key={step.id}
              style={{ animationDelay: `${idx * 120}ms` }}
              className={`step-enter flex items-center gap-6 px-6 py-5 border-b-2 border-black last:border-b-0 transition-colors ${
                status === "active" ? "bg-[#0033AD]/5" : ""
              }`}
            >
              <div
                className={`w-10 h-10 border-2 border-black flex items-center justify-center font-mono text-sm shrink-0 ${
                  status === "done"
                    ? "bg-[#0033AD] text-white border-[#0033AD]"
                    : status === "active"
                      ? "bg-black text-white"
                      : "bg-transparent text-black/30"
                }`}
              >
                {status === "done" ? (
                  "✓"
                ) : status === "active" ? (
                  <span className="animate-pulse">●</span>
                ) : (
                  String(step.id).padStart(2, "0")
                )}
              </div>
              <div className="flex-1">
                <div
                  className={`text-base ${
                    status === "pending" ? "text-black/30" : ""
                  }`}
                  style={{ fontFamily: "'Instrument Serif', serif" }}
                >
                  {step.label}
                </div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-black/40 mt-1">
                  {step.detail}
                </div>
              </div>
              {status === "active" && (
                <div className="text-[10px] uppercase tracking-[0.2em] text-[#0033AD]">
                  Processing
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-8 grid grid-cols-2 gap-px bg-black border-2 border-black">
        <DataCell label="Recipient" value={form.recipientName || "—"} />
        <DataCell label="Credential" value={form.credentialTitle || "—"} />
        <DataCell label="Issuer" value={form.institution} />
        <DataCell label="Type" value={form.credentialType} />
      </div>
    </div>
  );
}

// ============================================================================
// SUCCESS — QR + txHash + verify link
// ============================================================================
interface SuccessViewProps {
  form: FormState;
  txHash: string;
  claimCode: string;
  verifyUrl: string;
  onReset: () => void;
}

function SuccessView({
  form,
  txHash,
  claimCode,
  verifyUrl,
  onReset,
}: SuccessViewProps) {
  const [copied, setCopied] = useState(false);
  const [claimCodeCopied, setClaimCodeCopied] = useState(false);
  const [claimCodeAcknowledged, setClaimCodeAcknowledged] = useState(false);

  const copyClaimCode = async () => {
    try {
      await navigator.clipboard.writeText(claimCode);
      setClaimCodeCopied(true);
      setTimeout(() => setClaimCodeCopied(false), 1500);
    } catch {
      // ignore
    }
  };
  const truncatedHash = `${txHash.slice(0, 12)}...${txHash.slice(-12)}`;

  const copyHash = async () => {
    try {
      await navigator.clipboard.writeText(txHash);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16">
      {/* LEFT */}
      <section className="lg:col-span-7">
        <div className="flex items-baseline gap-4 mb-6">
          <span className="text-[11px] uppercase tracking-[0.25em] text-[#0033AD]">
            ✓ Published
          </span>
          <span className="h-px flex-1 bg-black/20" />
          <span className="text-[10px] uppercase tracking-[0.2em] text-black/40">
            Block confirmed
          </span>
        </div>

        <h1
          className="text-5xl md:text-7xl leading-[0.95] mb-6"
          style={{ fontFamily: "'Instrument Serif', serif" }}
        >
          On-chain.
          <br />
          <em className="italic text-[#0033AD]">Forever.</em>
        </h1>
        <p className="text-sm text-black/60 mb-10 max-w-md leading-relaxed">
          The credential hash for{" "}
          <span className="text-black">
            {form.recipientName || "the recipient"}
          </span>{" "}
          has been anchored to Cardano. Share the QR code or verifier link with
          any employer to confirm authenticity in under 2 seconds.
        </p>
        {/* CLAIM CODE — show once, requires acknowledgment */}
        {claimCode && !claimCodeAcknowledged && (
          <div className="border-2 border-[#0033AD] bg-[#0033AD]/5 p-6 mb-6">
            <div className="text-[10px] uppercase tracking-[0.25em] text-[#0033AD] mb-2">
              ⚠ Claim Code — Save Now, Won't Show Again
            </div>
            <div className="flex items-center justify-between gap-4 mb-4">
              <code className="text-2xl md:text-3xl tracking-[0.15em] font-bold">
                {claimCode}
              </code>
              <button
                onClick={copyClaimCode}
                className="text-[10px] uppercase tracking-[0.2em] bg-[#0033AD] text-white px-4 py-3 hover:bg-black transition-colors shrink-0"
              >
                {claimCodeCopied ? "Copied ✓" : "Copy"}
              </button>
            </div>
            <p className="text-xs text-black/70 mb-4 leading-relaxed">
              Share this 8-character code with the recipient via secure channel
              (email, SMS, or in-person). Only the SHA-256 hash is stored — the
              original code is shown once on this screen.
            </p>
            <button
              onClick={() => setClaimCodeAcknowledged(true)}
              className="text-[10px] uppercase tracking-[0.2em] border-2 border-black px-4 py-2 hover:bg-black hover:text-[#FAFAF7] transition-colors"
            >
              I've saved it → continue
            </button>
          </div>
        )}
        {/* TX Hash card */}
        <div className="border-2 border-black bg-white p-6 mb-6">
          <div className="text-[10px] uppercase tracking-[0.25em] text-black/50 mb-2">
            Transaction Hash
          </div>
          <div className="flex items-center justify-between gap-4">
            <code className="text-sm md:text-base break-all">
              {truncatedHash}
            </code>
            <button
              onClick={copyHash}
              className="text-[10px] uppercase tracking-[0.2em] border-2 border-black px-3 py-2 hover:bg-black hover:text-[#FAFAF7] transition-colors shrink-0"
            >
              {copied ? "Copied ✓" : "Copy"}
            </button>
          </div>
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <a
            href={`https://preprod.cardanoscan.io/transaction/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="border-2 border-black px-6 py-5 text-sm uppercase tracking-[0.2em] hover:bg-black hover:text-[#FAFAF7] transition-colors text-center"
          >
            View on Cardanoscan ↗
          </a>
          <a
            href={`/verify/${txHash}`}
            className="bg-[#0033AD] text-white px-6 py-5 text-sm uppercase tracking-[0.2em] hover:bg-black transition-colors text-center border-2 border-[#0033AD] hover:border-black"
          >
            Open Verifier →
          </a>
        </div>

        <button
          onClick={onReset}
          className="text-[11px] uppercase tracking-[0.2em] text-black/60 hover:text-[#0033AD] underline underline-offset-4"
        >
          ← Issue another credential
        </button>
      </section>

      {/* RIGHT — QR card */}
      <aside className="lg:col-span-5">
        <div className="lg:sticky lg:top-12">
          <div className="flex items-baseline gap-3 mb-4">
            <span className="text-[10px] uppercase tracking-[0.25em] text-black/50">
              Verifier QR
            </span>
            <span className="h-px flex-1 bg-black/20" />
          </div>

          <div className="border-2 border-black bg-white p-8">
            <div className="bg-white p-4 border-2 border-black flex items-center justify-center">
              <QRCodeSVG
                value={verifyUrl}
                size={256}
                level="H"
                fgColor="#000000"
                bgColor="#FFFFFF"
              />
            </div>
            <div className="mt-6 pt-6 border-t-2 border-black">
              <div className="text-[10px] uppercase tracking-[0.25em] text-black/50 mb-2">
                Scan with any phone
              </div>
              <div
                className="text-lg leading-tight mb-4"
                style={{ fontFamily: "'Instrument Serif', serif" }}
              >
                Verification in{" "}
                <em className="italic text-[#0033AD]">2 seconds</em>.
              </div>
              <code className="text-[10px] text-black/60 break-all block">
                {verifyUrl}
              </code>
            </div>
          </div>

          <div className="mt-4 text-[10px] uppercase tracking-[0.2em] text-black/40 text-center">
            CIP-20 · Cardano Preprod · Tamper-proof
          </div>
        </div>
      </aside>
    </div>
  );
}

// ============================================================================
// Sub-components
// ============================================================================
interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  required?: boolean;
}

// ============================================================================
// TabSwitcher — between "Issue New" and "History"
// ============================================================================
function TabSwitcher({
  phase,
  setPhase,
}: {
  phase: Phase;
  setPhase: (p: Phase) => void;
}) {
  const credentials = listMockCredentials();
  const count = credentials.length;

  return (
    <div className="grid grid-cols-3 border-2 border-black mb-8 font-mono text-[10px] md:text-xs uppercase tracking-[0.1em] md:tracking-[0.15em]">
      <button
        onClick={() => setPhase("idle")}
        className={`py-3 border-r-2 border-black transition-colors ${
          phase === "idle" ? "bg-black text-[#FAFAF7]" : "hover:bg-black/5"
        }`}
      >
        ▶ Issue New
      </button>
      <button
        onClick={() => setPhase("bulk")}
        className={`py-3 border-r-2 border-black transition-colors ${
          phase === "bulk" ? "bg-black text-[#FAFAF7]" : "hover:bg-black/5"
        }`}
      >
        ⊕ Bulk Issue
      </button>
      <button
        onClick={() => setPhase("history")}
        className={`py-3 transition-colors ${
          phase === "history" ? "bg-black text-[#FAFAF7]" : "hover:bg-black/5"
        }`}
      >
        ⌗ History {count > 0 && <span className="opacity-70">({count})</span>}
      </button>
    </div>
  );
}

// ============================================================================
// HistoryView — list of issued credentials
// ============================================================================
function HistoryView({ setPhase }: { setPhase: (p: Phase) => void }) {
  const [credentials, setCredentials] = useState<StoredMockCredential[]>([]);
  const [expandedTx, setExpandedTx] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "today" | "week">("all");

  useEffect(() => {
    const all = listMockCredentials();
    all.sort((a, b) => b._issuedAt - a._issuedAt);
    const unique = Array.from(new Map(all.map((c) => [c.txHash, c])).values());
    setCredentials(unique);
  }, []);

  const filtered = credentials.filter((c) => {
    if (filter === "all") return true;
    const issuedAt = Number(c._issuedAt) || 0;
    if (!issuedAt) return false;
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    if (filter === "today") return now - issuedAt < dayMs;
    if (filter === "week") return now - issuedAt < 7 * dayMs;
    return true;
  });

  if (credentials.length === 0) {
    return (
      <div className="border-2 border-black bg-white p-8 md:p-12 text-center">
        <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-black/50 mb-4">
          [ Empty history ]
        </div>
        <h2
          className="text-3xl md:text-4xl leading-tight mb-4 max-w-xl mx-auto"
          style={{ fontFamily: "'Instrument Serif', serif" }}
        >
          No credentials issued yet.
        </h2>
        <p className="text-sm text-black/60 mb-8 max-w-md mx-auto">
          Once you issue credentials, they'll appear here for tracking and
          re-sharing.
        </p>
        <button
          onClick={() => setPhase("idle")}
          className="border-2 border-black px-6 py-4 text-sm uppercase tracking-[0.2em] hover:bg-black hover:text-[#FAFAF7] transition-colors"
        >
          ▶ Issue your first credential
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-baseline md:justify-between gap-4 mb-6">
        <div className="flex items-baseline gap-4">
          <span className="text-[11px] uppercase tracking-[0.25em] text-black/50">
            № 02 · Issue history
          </span>
          <span className="font-mono text-xs text-black/60">
            {credentials.length} total
          </span>
        </div>
        <div className="flex items-center gap-2">
          {(["all", "today", "week"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-[10px] uppercase tracking-[0.15em] px-3 py-2 border-2 border-black transition-colors ${
                filter === f ? "bg-black text-[#FAFAF7]" : "hover:bg-black/5"
              }`}
            >
              {f === "all" ? "All" : f === "today" ? "Today" : "This week"}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="border-2 border-black bg-white p-8 text-center">
          <p className="text-sm text-black/60">
            No credentials in this time range.
          </p>
        </div>
      ) : (
        <div className="border-2 border-black bg-white">
          <div className="grid grid-cols-12 gap-4 px-5 py-3 border-b-2 border-black bg-[#FAFAF7] text-[9px] uppercase tracking-[0.2em] text-black/60">
            <div className="col-span-4">Recipient</div>
            <div className="col-span-5 hidden md:block">Credential</div>
            <div className="col-span-3 md:col-span-2 text-right md:text-left">
              Issued
            </div>
            <div className="col-span-1 hidden md:block text-right">Status</div>
          </div>

          {filtered.map((cred, index) => (
            <HistoryRow
              key={cred.txHash + "-" + index}
              credential={cred}
              expanded={expandedTx === cred.txHash}
              onToggle={() =>
                setExpandedTx(expandedTx === cred.txHash ? null : cred.txHash)
              }
            />
          ))}
        </div>
      )}

      <div className="mt-6 flex justify-center">
        <button
          onClick={() => setPhase("idle")}
          className="text-[11px] uppercase tracking-[0.2em] underline underline-offset-4 hover:text-[#0033AD]"
        >
          + Issue another credential
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// HistoryRow — expandable row in HistoryView
// ============================================================================
function HistoryRow({
  credential,
  expanded,
  onToggle,
}: {
  credential: StoredMockCredential;
  expanded: boolean;
  onToggle: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const issuedDate = new Date(credential._issuedAt);
  const dateStr = issuedDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const verifyUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/verify/${credential.txHash}`
      : `https://certchain-cardano.vercel.app/verify/${credential.txHash}`;

  const copyLink = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(verifyUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  return (
    <>
      <button
        onClick={onToggle}
        className={`w-full text-left grid grid-cols-12 gap-4 px-5 py-4 border-b-2 border-black last:border-b-0 hover:bg-[#FAFAF7] transition-colors ${
          expanded ? "bg-[#FAFAF7]" : ""
        }`}
      >
        <div
          className="col-span-4 text-sm md:text-base truncate"
          style={{ fontFamily: "'Instrument Serif', serif" }}
        >
          {credential.recipientName}
        </div>
        <div className="col-span-5 text-sm hidden md:block truncate">
          {credential.credentialTitle}
        </div>
        <div className="col-span-3 md:col-span-2 text-[10px] uppercase tracking-[0.15em] text-black/60 text-right md:text-left">
          {dateStr}
        </div>
        <div className="col-span-1 hidden md:flex justify-end items-center">
          <span className="text-[9px] uppercase tracking-[0.2em] text-[#0033AD] border border-[#0033AD] px-2 py-0.5">
            ✓ Active
          </span>
        </div>
      </button>

      {expanded && (
        <div className="px-5 py-5 bg-[#FAFAF7] border-b-2 border-black last:border-b-0">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <div className="text-[9px] uppercase tracking-[0.2em] text-black/50 mb-1">
                Credential
              </div>
              <div className="text-sm md:text-base mb-3">
                {credential.credentialTitle}
              </div>
              <div className="text-[9px] uppercase tracking-[0.2em] text-black/50 mb-1">
                Type
              </div>
              <div className="text-sm mb-3">{credential.credentialType}</div>
              <div className="text-[9px] uppercase tracking-[0.2em] text-black/50 mb-1">
                Institution
              </div>
              <div className="text-sm">{credential.institution}</div>
            </div>
            <div>
              <div className="text-[9px] uppercase tracking-[0.2em] text-black/50 mb-1">
                Transaction Hash
              </div>
              <code className="text-[10px] break-all block mb-4">
                {credential.txHash.slice(0, 32)}...
                {credential.txHash.slice(-12)}
              </code>
              <div className="grid grid-cols-2 gap-2">
                <Link
                  to={`/verify/${credential.txHash}`}
                  className="text-[10px] uppercase tracking-[0.2em] border-2 border-black px-3 py-2 hover:bg-black hover:text-[#FAFAF7] transition-colors text-center"
                >
                  Verify →
                </Link>
                <button
                  onClick={copyLink}
                  className="text-[10px] uppercase tracking-[0.2em] border-2 border-black px-3 py-2 hover:bg-black hover:text-[#FAFAF7] transition-colors"
                >
                  {copied ? "Copied ✓" : "Copy link"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Field({ label, required, ...props }: FieldProps) {
  const id =
    props.id ?? `field-${label.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-[11px] uppercase tracking-[0.2em] text-black/60 mb-2"
      >
        {label}
        {required && <span className="text-[#0033AD] ml-1">*</span>}
      </label>
      <input
        id={id}
        {...props}
        className="w-full bg-transparent border-b-2 border-black py-3 text-base font-mono focus:outline-none focus:border-[#0033AD] placeholder:text-black/30"
      />
    </div>
  );
}

function CredentialCard({ form }: { form: FormState }) {
  return (
    <div className="border-2 border-black bg-white p-8 relative">
      {/* corner ticks */}
      <div className="absolute top-2 left-2 w-3 h-3 border-l-2 border-t-2 border-black" />
      <div className="absolute top-2 right-2 w-3 h-3 border-r-2 border-t-2 border-black" />
      <div className="absolute bottom-2 left-2 w-3 h-3 border-l-2 border-b-2 border-black" />
      <div className="absolute bottom-2 right-2 w-3 h-3 border-r-2 border-b-2 border-black" />

      <div className="text-[10px] uppercase tracking-[0.3em] text-black/50 mb-1">
        {form.credentialType || "Diploma"}
      </div>
      <div className="text-[10px] uppercase tracking-[0.2em] text-black/40 mb-8">
        {form.institution || "Institution"}
      </div>

      <div
        className="text-3xl leading-tight mb-6 min-h-[5rem]"
        style={{ fontFamily: "'Instrument Serif', serif" }}
      >
        {form.credentialTitle || (
          <span className="text-black/20 italic">Credential title</span>
        )}
      </div>

      <div className="text-[10px] uppercase tracking-[0.2em] text-black/40 mb-1">
        Awarded to
      </div>
      <div
        className="text-2xl mb-8"
        style={{ fontFamily: "'Instrument Serif', serif" }}
      >
        {form.recipientName || (
          <span className="text-black/20 italic">Recipient name</span>
        )}
      </div>

      <div className="flex items-end justify-between pt-6 border-t-2 border-black">
        <div>
          <div className="text-[9px] uppercase tracking-[0.2em] text-black/40">
            Issued
          </div>
          <div className="text-sm">{form.issueDate}</div>
        </div>
        <div className="text-right">
          <div className="text-[9px] uppercase tracking-[0.2em] text-black/40">
            Anchored on
          </div>
          <div className="text-sm text-[#0033AD]">Cardano</div>
        </div>
      </div>
    </div>
  );
}

function MetaPanel({ form }: { form: FormState }) {
  const fields: [string, string][] = [
    ["Type", form.credentialType],
    ["Email", form.recipientEmail || "—"],
    ["Date", form.issueDate],
    ["Network", "Preprod"],
  ];
  return (
    <div className="mt-4 grid grid-cols-2 gap-px bg-black border-2 border-black">
      {fields.map(([k, v]) => (
        <div key={k} className="bg-[#FAFAF7] px-4 py-3">
          <div className="text-[9px] uppercase tracking-[0.2em] text-black/40">
            {k}
          </div>
          <div className="text-sm truncate">{v}</div>
        </div>
      ))}
    </div>
  );
}

interface DataCellProps {
  label: string;
  value: string;
}

function DataCell({ label, value }: DataCellProps) {
  return (
    <div className="bg-[#FAFAF7] px-5 py-4">
      <div className="text-[9px] uppercase tracking-[0.2em] text-black/40 mb-1">
        {label}
      </div>
      <div
        className="text-base truncate"
        style={{ fontFamily: "'Instrument Serif', serif" }}
      >
        {value}
      </div>
    </div>
  );
}
