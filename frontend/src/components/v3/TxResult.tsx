/**
 * src/components/v3/TxResult.tsx
 * ────────────────────────────────────────────────────────────────
 * Displays mint transaction result for V3 prototype.
 * Shows tx hash, Cardanoscan link, policy ID, asset info.
 *
 * ⚠️ V3 PROTOTYPE — separate from V2 flows.
 * ────────────────────────────────────────────────────────────────
 */

import { useState, useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';

export interface MintResult {
  txHash: string;
  policyId: string;
  assetName: string;
  recipientName: string;
  certTitle: string;
  institution: string;
  claimCode?: string;
  mode?: 'cip30' | 'v2-custody';
}

interface TxResultProps {
  result: MintResult;
  onReset: () => void;
}

export default function TxResult({ result, onReset }: TxResultProps) {
  const [copied, setCopied] = useState(false);
  const qrRef = useRef<HTMLCanvasElement>(null);

  const cardanoscanUrl = `https://preprod.cardanoscan.io/transaction/${result.txHash}`;
  const verifyUrl = `${window.location.origin}/verify/${result.txHash}`;
  const truncatedHash = `${result.txHash.slice(0, 16)}...${result.txHash.slice(-16)}`;

  const copyHash = async () => {
    try {
      await navigator.clipboard.writeText(result.txHash);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API may not be available
    }
  };

  const downloadQR = () => {
    const canvas = qrRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `certchain-${result.recipientName.replace(/\s+/g, '-')}-${result.assetName}.png`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Success header */}
      <div className="flex items-baseline gap-4 mb-2">
        <span className="text-[11px] uppercase tracking-[0.25em] text-[#0033AD]">
          ✓ Minted Successfully
        </span>
        <span className="h-px flex-1 bg-black/20" />
        <span className="text-[10px] uppercase tracking-[0.2em] text-black/40">
          On-chain confirmed
        </span>
      </div>

      <h2
        className="text-4xl md:text-5xl leading-[0.95]"
        style={{ fontFamily: "'Instrument Serif', serif", fontWeight: 400 }}
      >
        Credential{' '}
        <em className="italic text-[#0033AD]">on-chain.</em>
      </h2>

      <p className="text-sm text-black/60 max-w-lg leading-relaxed">
        NFT credential cho{' '}
        <span className="text-black font-medium">{result.recipientName}</span>{' '}
        đã được mint trực tiếp từ wallet của bạn lên Cardano Preprod.
        Transaction không thể bị thay đổi hay xóa.
      </p>

      {result.claimCode && (
        <div className="border-2 border-[#0033AD] bg-[#0033AD]/5 p-5">
          <div className="text-[10px] uppercase tracking-[0.25em] text-[#0033AD] mb-2">
            V2 Claim Code
          </div>
          <code className="text-2xl tracking-[0.2em]">{result.claimCode}</code>
          <p className="mt-2 text-[11px] uppercase tracking-[0.15em] text-black/50">
            Share this once with the student to claim the credential.
          </p>
        </div>
      )}

      {/* TX Hash card */}
      <div className="border-2 border-black bg-white p-6">
        <div className="text-[10px] uppercase tracking-[0.25em] text-black/50 mb-2">
          Transaction Hash
        </div>
        <div className="flex items-center justify-between gap-4">
          <code className="text-sm md:text-base break-all">{truncatedHash}</code>
          <button
            onClick={copyHash}
            className="text-[10px] uppercase tracking-[0.2em] border-2 border-black px-3 py-2 hover:bg-black hover:text-[#FAFAF7] transition-colors shrink-0"
          >
            {copied ? 'Copied ✓' : 'Copy'}
          </button>
        </div>
      </div>

      {/* QR Code — verifier link */}
      <div className="border-2 border-black bg-white p-6">
        <div className="flex items-baseline gap-3 mb-4">
          <span className="text-[10px] uppercase tracking-[0.25em] text-black/50">
            Verify QR Code
          </span>
          <span className="h-px flex-1 bg-black/10" />
          <button
            type="button"
            onClick={downloadQR}
            className="text-[10px] uppercase tracking-[0.2em] border-2 border-black px-3 py-1.5 hover:bg-black hover:text-[#FAFAF7] transition-colors"
          >
            Download PNG
          </button>
        </div>
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="border-2 border-black p-3 bg-white shrink-0">
            <QRCodeCanvas
              ref={qrRef}
              value={verifyUrl}
              size={160}
              level="M"
              marginSize={0}
            />
          </div>
          <div className="flex-1 space-y-2">
            <p className="text-sm text-black/70 leading-relaxed">
              Sinh viên quét QR này để xem thông tin bằng tốt nghiệp trực tiếp từ Cardano Preprod.
            </p>
            <code className="block text-[10px] text-black/40 break-all">{verifyUrl}</code>
          </div>
        </div>
      </div>

      {/* Metadata grid */}
      <div className="grid grid-cols-2 gap-px bg-black border-2 border-black">
        <DataCell label="Recipient" value={result.recipientName} />
        <DataCell label="Credential" value={result.certTitle} />
        <DataCell label="Institution" value={result.institution} />
        <DataCell label="Asset Name" value={result.assetName} />
      </div>

      {/* Policy ID */}
      <div className="border-2 border-black/30 bg-white p-4">
        <div className="text-[10px] uppercase tracking-[0.25em] text-black/50 mb-1">
          Policy ID
        </div>
        <code className="text-[11px] text-black/70 break-all">{result.policyId}</code>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <a
          href={cardanoscanUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="border-2 border-black px-6 py-5 text-sm uppercase tracking-[0.2em] hover:bg-black hover:text-[#FAFAF7] transition-colors text-center"
        >
          View on Cardanoscan ↗
        </a>
        <button
          onClick={onReset}
          className="bg-[#0033AD] text-white px-6 py-5 text-sm uppercase tracking-[0.2em] hover:bg-black transition-colors text-center border-2 border-[#0033AD] hover:border-black"
        >
          Mint Another →
        </button>
      </div>

      {/* V3 note */}
      <p className="text-[10px] uppercase tracking-[0.2em] text-black/30 text-center pt-4">
        V3 Prototype · CIP-30 Browser Wallet · No custody wallet involved
      </p>
    </div>
  );
}

// ─── Sub-component ──────────────────────────────────────────

function DataCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#FAFAF7] p-4">
      <div className="text-[10px] uppercase tracking-[0.25em] text-black/50 mb-1">
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
