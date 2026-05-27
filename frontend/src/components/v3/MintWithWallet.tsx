/**
 * src/components/v3/MintWithWallet.tsx
 * ────────────────────────────────────────────────────────────────
 * Mint credential NFT using connected browser wallet (CIP-30).
 * Builds transaction client-side with Mesh.js, user signs via
 * Eternl popup, submits to Cardano Preprod.
 *
 * CIP-25 metadata structure matches V2 backend for consistency.
 *
 * ⚠️ V3 PROTOTYPE — no Supabase insert, no custody wallet.
 * ────────────────────────────────────────────────────────────────
 */

import { useState } from 'react';
import type { ChangeEvent } from 'react';
import type { MeshWallet } from './WalletConnect';
import { mintCertificate } from '../../lib/mintApi';
import TxResult from './TxResult';
import type { MintResult } from './TxResult';

// ─── Types ────────────────────────────────────────────────────

interface MintFormState {
  recipientName: string;
  recipientEmail: string;
  studentWalletAddress: string;
  certTitle: string;
  institution: string;
  issueDate: string;
  certType: string;
  notes: string;
}

type MintPhase = 'form' | 'building' | 'signing' | 'submitting' | 'success' | 'error';

interface MintWithWalletProps {
  wallet: MeshWallet;
  walletAddress: string;
}

// ─── Constants ────────────────────────────────────────────────

const CREDENTIAL_TYPES = [
  'Diploma',
  'Certificate',
  'Award',
  'Course Completion',
  'Professional License',
];

const initialForm: MintFormState = {
  recipientName: '',
  recipientEmail: 'student.demo@certchain.local',
  studentWalletAddress: '',
  certTitle: '',
  institution: ' University',
  issueDate: new Date().toISOString().slice(0, 10),
  certType: 'Diploma',
  notes: '',
};

const STEP_LABELS: Record<string, { label: string; detail: string }> = {
  building: {
    label: 'Building mint transaction',
    detail: 'ForgeScript · CIP-25 metadata · User wallet as initiator',
  },
  signing: {
    label: 'Waiting for wallet signature',
    detail: 'Eternl popup · User approves transaction',
  },
  submitting: {
    label: 'Submitting to Cardano Preprod',
    detail: 'Blockfrost · Broadcasting signed tx',
  },
};

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error(`${label} timed out after ${Math.round(ms / 1000)}s`));
    }, ms);

    promise
      .then(resolve)
      .catch(reject)
      .finally(() => window.clearTimeout(timer));
  });
}

// ─── Component ────────────────────────────────────────────────

export default function MintWithWallet({ wallet, walletAddress }: MintWithWalletProps) {
  const [form, setForm] = useState<MintFormState>(initialForm);
  const [phase, setPhase] = useState<MintPhase>('form');
  const [error, setError] = useState('');
  const [debugMessage, setDebugMessage] = useState('');
  const [result, setResult] = useState<MintResult | null>(null);

  const handleChange =
    (key: keyof MintFormState) =>
    (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleMint = async () => {
    const studentWalletAddress = form.studentWalletAddress.trim();
    if (!form.recipientName || !form.certTitle || !studentWalletAddress) return;

    if (!studentWalletAddress.startsWith('addr_test')) {
      setError('Student wallet address phải bắt đầu bằng addr_test... (Preprod)');
      setPhase('error');
      return;
    }

    setError('');
    setDebugMessage('Starting mint flow...');

    try {
      // ── Step 1: Backend builds unsigned tx ────────────────
      setPhase('building');
      setDebugMessage('Backend đang build transaction...');

      const buildRes = await withTimeout(
        fetch('/api/v3/build-tx', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            issuer_address: walletAddress,
            recipient_address: studentWalletAddress,
            recipient_name: form.recipientName,
            cert_title: form.certTitle,
            institution: form.institution,
            issue_date: form.issueDate,
            cert_type: form.certType,
          }),
        }),
        30_000,
        'Backend build-tx'
      );

      if (!buildRes.ok) {
        const errBody = await buildRes.json().catch(() => ({ message: buildRes.statusText }));
        throw new Error(`Build tx failed: ${errBody.message ?? buildRes.statusText}`);
      }

      const { unsigned_tx, policy_id, asset_name } = await buildRes.json() as {
        unsigned_tx: string;
        policy_id: string;
        asset_name: string;
      };

      // ── Step 2: User signs via Eternl popup ───────────────
      setPhase('signing');
      setDebugMessage('Chờ Eternl popup để ký...');
      // CIP-30 signTx returns witness_set, not full tx
      const witnessSet = await withTimeout(wallet.signTx(unsigned_tx, true), 60_000, 'Wallet signing');

      // ── Step 3: Backend merges witnesses + submits ────────
      setPhase('submitting');
      setDebugMessage('Submit lên Cardano Preprod qua Blockfrost...');
      const submitRes = await withTimeout(
        fetch('/api/v3/submit-tx', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ unsigned_tx, witness_set: witnessSet }),
        }),
        60_000,
        'Submit tx'
      );
      if (!submitRes.ok) {
        const errBody = await submitRes.json().catch(() => ({ message: submitRes.statusText }));
        throw new Error(`Submit failed: ${errBody.message ?? submitRes.statusText}`);
      }
      const { tx_hash: txHash } = await submitRes.json() as { tx_hash: string };

      setResult({
        txHash,
        policyId: policy_id,
        assetName: asset_name,
        recipientName: form.recipientName,
        certTitle: form.certTitle,
        institution: form.institution,
      });
      setPhase('success');
      setDebugMessage('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.toLowerCase().includes('user') && msg.toLowerCase().includes('declined')) {
        setError('Bạn đã từ chối ký transaction trong Eternl.');
      } else if (msg.toLowerCase().includes('insufficient')) {
        setError('Không đủ tADA để trả phí. Hãy nạp thêm từ Cardano Faucet.');
      } else {
        setError(msg);
      }
      setPhase('error');
      setDebugMessage('');
    }
  };

  const handleV2Mint = async () => {
    if (!form.recipientName || !form.certTitle) return;

    setError('');
    setPhase('building');
    setDebugMessage('Calling V2 custody mint engine...');

    try {
      const v2Result = await mintCertificate({
        recipient_email: form.recipientEmail || 'student.demo@certchain.local',
        recipient_name: form.recipientName,
        cert_title: form.certTitle,
        institution: form.institution,
        issue_date: form.issueDate,
        cert_type: form.certType,
        notes: form.notes,
      });

      setResult({
        txHash: v2Result.tx_hash,
        policyId: v2Result.policy_id,
        assetName: v2Result.asset_name,
        recipientName: form.recipientName,
        certTitle: form.certTitle,
        institution: form.institution,
        claimCode: v2Result.claim_code,
        mode: 'v2-custody',
      });
      setPhase('success');
      setDebugMessage('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setPhase('error');
      setDebugMessage('');
    }
  };

  void handleMint;

  const reset = () => {
    setPhase('form');
    setForm(initialForm);
    setResult(null);
    setError('');
    setDebugMessage('');
  };

  // ─── RENDER: Success ────────────────────────────────────────
  if (phase === 'success' && result) {
    return <TxResult result={result} onReset={reset} />;
  }

  // ─── RENDER: Minting in progress ───────────────────────────
  if (phase === 'building' || phase === 'signing' || phase === 'submitting') {
    const steps = ['building', 'signing', 'submitting'] as const;
    const currentIdx = steps.indexOf(phase);

    return (
      <div className="space-y-6">
        <div className="flex items-baseline gap-4 mb-2">
          <span className="text-[11px] uppercase tracking-[0.25em] text-[#0033AD]">
            ● Minting
          </span>
          <span className="h-px flex-1 bg-black/20" />
        </div>

        <h2
          className="text-4xl md:text-5xl leading-[0.95]"
          style={{ fontFamily: "'Instrument Serif', serif", fontWeight: 400 }}
        >
          Minting via{' '}
          <em className="italic text-[#0033AD]">your wallet</em>...
        </h2>

        {debugMessage && (
          <div className="border-2 border-[#0033AD] bg-[#0033AD]/5 p-4">
            <div className="text-[10px] uppercase tracking-[0.2em] text-[#0033AD] mb-1">
              Current checkpoint
            </div>
            <div className="text-sm text-black/70 font-mono">{debugMessage}</div>
          </div>
        )}

        <div className="border-2 border-black bg-white">
          {steps.map((step, idx) => {
            const info = STEP_LABELS[step];
            const status =
              idx < currentIdx ? 'done' : idx === currentIdx ? 'active' : 'pending';
            return (
              <div
                key={step}
                className={`flex items-center gap-6 px-6 py-5 border-b-2 border-black last:border-b-0 transition-colors ${
                  status === 'active' ? 'bg-[#0033AD]/5' : ''
                }`}
              >
                <div
                  className={`w-10 h-10 border-2 border-black flex items-center justify-center font-mono text-sm shrink-0 ${
                    status === 'done'
                      ? 'bg-[#0033AD] text-white border-[#0033AD]'
                      : status === 'active'
                        ? 'bg-black text-white'
                        : 'bg-transparent text-black/30'
                  }`}
                >
                  {status === 'done' ? (
                    '✓'
                  ) : status === 'active' ? (
                    <span className="animate-pulse">●</span>
                  ) : (
                    String(idx + 1).padStart(2, '0')
                  )}
                </div>
                <div className="flex-1">
                  <div
                    className={`text-base ${status === 'pending' ? 'text-black/30' : ''}`}
                    style={{ fontFamily: "'Instrument Serif', serif" }}
                  >
                    {info.label}
                  </div>
                  <div className="text-[10px] uppercase tracking-[0.2em] text-black/40 mt-1">
                    {info.detail}
                  </div>
                </div>
                {status === 'active' && (
                  <div className="text-[10px] uppercase tracking-[0.2em] text-[#0033AD]">
                    {step === 'signing' ? 'Check Eternl' : 'Processing'}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Minting summary */}
        <div className="grid grid-cols-2 gap-px bg-black border-2 border-black">
          <div className="bg-[#FAFAF7] p-4">
            <div className="text-[10px] uppercase tracking-[0.25em] text-black/50 mb-1">Recipient</div>
            <div className="text-base" style={{ fontFamily: "'Instrument Serif', serif" }}>
              {form.recipientName}
            </div>
          </div>
          <div className="bg-[#FAFAF7] p-4">
            <div className="text-[10px] uppercase tracking-[0.25em] text-black/50 mb-1">Credential</div>
            <div className="text-base" style={{ fontFamily: "'Instrument Serif', serif" }}>
              {form.certTitle}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── RENDER: Form ───────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex items-baseline gap-4 mb-2">
        <span className="text-[11px] uppercase tracking-[0.25em] text-black/50">
          Mint Credential
        </span>
        <span className="h-px flex-1 bg-black/20" />
      </div>

      {(error || phase === 'error') && (
        <div className="border-2 border-red-600 bg-red-50 p-4">
          <div className="text-[10px] uppercase tracking-[0.2em] text-red-700 mb-1">
            ✗ Mint Failed
          </div>
          <pre className="text-sm text-red-900 font-mono break-words whitespace-pre-wrap">{error}</pre>
          <button
            onClick={() => {
              setPhase('form');
              setError('');
            }}
            className="mt-3 text-[10px] uppercase tracking-[0.2em] border-2 border-red-600 px-3 py-2 text-red-700 hover:bg-red-600 hover:text-white transition-colors"
          >
            Try Again
          </button>
        </div>
      )}

      <form onSubmit={(e) => e.preventDefault()} className="space-y-8">
        {/* Recipient Name */}
        <div>
          <label className="block text-[11px] uppercase tracking-[0.2em] text-black/60 mb-2">
            Recipient · Full Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={form.recipientName}
            onChange={handleChange('recipientName')}
            placeholder="Nguyễn Văn A"
            className="w-full bg-transparent border-b-2 border-black py-3 text-base font-mono focus:outline-none focus:border-[#0033AD] placeholder:text-black/20"
          />
        </div>

        {/* Student Wallet Address */}
        <div>
          <label className="block text-[11px] uppercase tracking-[0.2em] text-black/60 mb-2">
            Student Wallet Address <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={form.studentWalletAddress}
            onChange={handleChange('studentWalletAddress')}
            placeholder="addr_test1..."
            className="w-full bg-transparent border-b-2 border-black py-3 text-base font-mono focus:outline-none focus:border-[#0033AD] placeholder:text-black/20"
          />
          <p className="mt-2 text-[10px] uppercase tracking-[0.15em] text-black/40">
            NFT credential se duoc mint ve dia chi vi sinh vien nay.
          </p>
        </div>

        <div>
          <label className="block text-[11px] uppercase tracking-[0.2em] text-black/60 mb-2">
            Student Email <span className="text-black/30 normal-case">(for V2 fallback)</span>
          </label>
          <input
            type="email"
            value={form.recipientEmail}
            onChange={handleChange('recipientEmail')}
            placeholder="student@example.edu"
            className="w-full bg-transparent border-b-2 border-black py-3 text-base font-mono focus:outline-none focus:border-[#0033AD] placeholder:text-black/20"
          />
        </div>

        {/* Credential Title */}
        <div>
          <label className="block text-[11px] uppercase tracking-[0.2em] text-black/60 mb-2">
            Credential · Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={form.certTitle}
            onChange={handleChange('certTitle')}
            placeholder="Bachelor of Computer Science"
            className="w-full bg-transparent border-b-2 border-black py-3 text-base font-mono focus:outline-none focus:border-[#0033AD] placeholder:text-black/20"
          />
        </div>

        {/* Institution + Issue Date */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <label className="block text-[11px] uppercase tracking-[0.2em] text-black/60 mb-2">
              Issuing Institution
            </label>
            <input
              type="text"
              value={form.institution}
              onChange={handleChange('institution')}
              className="w-full bg-transparent border-b-2 border-black py-3 text-base font-mono focus:outline-none focus:border-[#0033AD] placeholder:text-black/20"
            />
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-[0.2em] text-black/60 mb-2">
              Issue Date
            </label>
            <input
              type="date"
              value={form.issueDate}
              onChange={handleChange('issueDate')}
              className="w-full bg-transparent border-b-2 border-black py-3 text-base font-mono focus:outline-none focus:border-[#0033AD]"
            />
          </div>
        </div>

        {/* Credential Type */}
        <div>
          <label className="block text-[11px] uppercase tracking-[0.2em] text-black/60 mb-2">
            Credential Type
          </label>
          <select
            value={form.certType}
            onChange={handleChange('certType')}
            className="w-full bg-transparent border-b-2 border-black py-3 text-base font-mono focus:outline-none focus:border-[#0033AD] cursor-pointer"
          >
            {CREDENTIAL_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-[11px] uppercase tracking-[0.2em] text-black/60 mb-2">
            Notes <span className="text-black/30 normal-case">(optional)</span>
          </label>
          <textarea
            value={form.notes}
            onChange={handleChange('notes')}
            rows={3}
            placeholder="Honors, GPA, special distinctions..."
            className="w-full bg-transparent border-2 border-black p-4 text-sm font-mono focus:outline-none focus:border-[#0033AD] resize-none placeholder:text-black/20"
          />
        </div>

        {/* Submit */}
        <div className="pt-6 border-t-2 border-black flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <p className="text-[11px] uppercase tracking-[0.15em] text-black/50 max-w-xs leading-relaxed">
            Transaction se duoc ky boi vi issuer dang connect.
            NFT se mint truc tiep ve vi sinh vien — khong qua custody.
          </p>
          <button
            type="button"
            onClick={handleMint}
            className="group relative bg-black text-[#FAFAF7] px-10 py-5 text-sm uppercase tracking-[0.2em] border-2 border-black hover:bg-[#0033AD] hover:border-[#0033AD] transition-colors"
          >
            Mint Credential NFT →
          </button>
        </div>
        <div className="border-2 border-[#0033AD] bg-[#0033AD]/5 p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <p className="text-[11px] uppercase tracking-[0.15em] text-[#0033AD] leading-relaxed">
            Use this for the live demo: V2 custody mint engine returns real Preprod tx hash + claim code.
          </p>
          <button
            type="button"
            onClick={handleV2Mint}
            className="bg-[#0033AD] border-2 border-[#0033AD] px-6 py-4 text-[12px] uppercase tracking-[0.2em] text-white hover:bg-black hover:border-black transition-colors"
          >
            Mint via V2 Engine
          </button>
        </div>
      </form>
    </div>
  );
}
