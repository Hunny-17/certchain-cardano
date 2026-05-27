/**
 * src/components/v3/WalletConnect.tsx
 * CIP-30 wallet connection — uses raw window.cardano API (no Mesh imports at
 * connect time) to avoid pulling in @cardano-sdk/* CJS chains in the browser.
 * The returned wallet object is compatible with Mesh Transaction({ initiator })
 * because Transaction only needs getChangeAddress/signTx/submitTx when a
 * Blockfrost fetcher is provided for UTxO/protocol-params lookups.
 */

import { useState, useEffect, useCallback } from 'react';

// ─── Types ────────────────────────────────────────────────────

/** Raw CIP-30 wallet API returned by window.cardano.eternl.enable() */
interface Cip30Api {
  getBalance(): Promise<string>;
  getChangeAddress(): Promise<string>;
  getNetworkId(): Promise<number>;
  getUtxos(amount?: string, paginate?: { page: number; limit: number }): Promise<string[] | null>;
  getCollateral?(): Promise<string[] | null>;
  signTx(tx: string, partialSign?: boolean): Promise<string>;
  submitTx(tx: string): Promise<string>;
}

/** Minimal wallet shape accepted by Mesh Transaction({ initiator }) */
export interface MeshWallet {
  getChangeAddress(): Promise<string>;
  getUtxos(): Promise<string[]>;
  signTx(tx: string, partialSign?: boolean): Promise<string>;
  submitTx(tx: string): Promise<string>;
}

export interface WalletState {
  wallet: MeshWallet | null;
  address: string;
  balance: number; // ADA
  connected: boolean;
}

interface WalletConnectProps {
  onConnect: (state: WalletState) => void;
  onDisconnect: () => void;
  walletState: WalletState;
}

interface InstalledWallet {
  name: string;
  icon: string;
}

interface CardanoWalletExtension {
  name?: string;
  icon?: string;
  apiVersion?: string;
  version?: string;
  enable?: () => Promise<Cip30Api>;
}

// ─── Helpers ──────────────────────────────────────────────────

function getCardano(): Record<string, CardanoWalletExtension> {
  return (window as unknown as { cardano?: Record<string, CardanoWalletExtension> }).cardano ?? {};
}

/** Decode a CBOR-encoded lovelace value (best-effort). */
function parseLovelaceFromCbor(hex: string): number {
  const bytes = (hex.match(/.{1,2}/g) ?? []).map((b) => parseInt(b, 16));
  const first = bytes[0];
  if (first === undefined || isNaN(first)) return 0;
  const major = first >> 5;
  const info = first & 0x1f;
  if (major !== 0) return 0;
  if (info < 24) return info;
  if (info === 24) return bytes[1] ?? 0;
  if (info === 25) return ((bytes[1] ?? 0) << 8) | (bytes[2] ?? 0);
  if (info === 26)
    return ((bytes[1] ?? 0) * 0x1000000) | ((bytes[2] ?? 0) << 16) | ((bytes[3] ?? 0) << 8) | (bytes[4] ?? 0);
  if (info === 27) {
    let v = 0n;
    for (let i = 1; i <= 8; i++) v = (v << 8n) | BigInt(bytes[i] ?? 0);
    return Number(v);
  }
  return 0;
}

/** Wrap raw CIP-30 API into the shape Mesh Transaction expects. */
function wrapCip30(api: Cip30Api): MeshWallet {
  return {
    getChangeAddress: () => api.getChangeAddress(),
    getUtxos: async () => (await api.getUtxos()) ?? [],
    signTx: (tx, partialSign) => api.signTx(tx, partialSign),
    submitTx: (tx) => api.submitTx(tx),
  };
}

// ─── Component ────────────────────────────────────────────────

export default function WalletConnect({ onConnect, onDisconnect, walletState }: WalletConnectProps) {
  const [installedWallets, setInstalledWallets] = useState<InstalledWallet[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState('');
  const [detected, setDetected] = useState<boolean | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      const cardano = getCardano();
      setInstalledWallets(
        Object.entries(cardano).map(([key, w]) => ({ name: w.name ?? key, icon: w.icon ?? '' }))
      );
      setDetected(Boolean(cardano.eternl));
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const connectWallet = useCallback(async () => {
    setIsConnecting(true);
    setError('');
    try {
      const eternl = getCardano().eternl;
      if (!eternl?.enable) throw new Error('Eternl extension not found.');

      const api = await eternl.enable();
      const wallet = wrapCip30(api);
      const address = await api.getChangeAddress();

      let adaBalance = 0;
      try {
        adaBalance = parseLovelaceFromCbor(await api.getBalance()) / 1_000_000;
      } catch { /* balance is optional */ }

      onConnect({ wallet, address, balance: adaBalance, connected: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.toLowerCase().includes('user') && msg.toLowerCase().includes('declined')) {
        setError('Bạn đã từ chối kết nối. Thử lại khi sẵn sàng.');
      } else if (msg.toLowerCase().includes('no account')) {
        setError('Không tìm thấy account. Hãy chắc chắn Eternl đang ở Preprod network.');
      } else {
        setError(`Kết nối thất bại: ${msg}`);
      }
    } finally {
      setIsConnecting(false);
    }
  }, [onConnect]);

  const disconnect = useCallback(() => {
    onDisconnect();
    setError('');
  }, [onDisconnect]);

  const truncateAddr = (addr: string) => `${addr.slice(0, 12)}...${addr.slice(-8)}`;

  // ─── Render: detecting ──────────────────────────────────────
  if (detected === null) {
    return (
      <div className="border-2 border-black bg-white p-6">
        <div className="flex items-center gap-3">
          <span className="w-3 h-3 bg-black/30 animate-pulse" />
          <span className="text-[11px] uppercase tracking-[0.2em] text-black/50">
            Detecting wallet extensions...
          </span>
        </div>
      </div>
    );
  }

  // ─── Render: no Eternl ──────────────────────────────────────
  if (!detected) {
    return (
      <div className="border-2 border-black bg-white p-6">
        <div className="flex items-baseline gap-3 mb-4">
          <span className="text-[11px] uppercase tracking-[0.25em] text-black/50">Wallet Required</span>
          <span className="h-px flex-1 bg-black/20" />
        </div>
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 border-2 border-black flex items-center justify-center shrink-0 text-xl">⚠</div>
          <div>
            <p className="text-lg mb-2" style={{ fontFamily: "'Instrument Serif', serif" }}>
              Eternl wallet <em className="italic text-[#0033AD]">not detected</em>.
            </p>
            <p className="text-sm text-black/60 mb-4 leading-relaxed">
              Install the Eternl browser extension and switch to <strong>Preprod network</strong>.
            </p>
            <a
              href="https://eternl.io"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block border-2 border-black px-5 py-3 text-[11px] uppercase tracking-[0.2em] hover:bg-black hover:text-[#FAFAF7] transition-colors"
            >
              Install Eternl ↗
            </a>
            {installedWallets.length > 0 && (
              <p className="text-[10px] text-black/40 mt-3">
                Detected: {installedWallets.map((w) => w.name).join(', ')} — prototype only supports Eternl.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─── Render: connected ──────────────────────────────────────
  if (walletState.connected) {
    return (
      <div className="border-2 border-[#0033AD] bg-[#0033AD]/5 p-6">
        <div className="flex items-baseline gap-3 mb-4">
          <span className="text-[11px] uppercase tracking-[0.25em] text-[#0033AD]">● Connected</span>
          <span className="h-px flex-1 bg-[#0033AD]/20" />
          <button
            type="button"
            onClick={disconnect}
            className="text-[10px] uppercase tracking-[0.2em] text-black/40 hover:text-red-600 transition-colors"
          >
            Disconnect
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border-2 border-black/20 bg-white p-4">
            <div className="text-[10px] uppercase tracking-[0.25em] text-black/50 mb-1">Wallet Address</div>
            <code className="text-sm break-all">{truncateAddr(walletState.address)}</code>
          </div>
          <div className="border-2 border-black/20 bg-white p-4">
            <div className="text-[10px] uppercase tracking-[0.25em] text-black/50 mb-1">Balance (Preprod)</div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl" style={{ fontFamily: "'Instrument Serif', serif" }}>
                {walletState.balance.toFixed(2)}
              </span>
              <span className="text-[11px] uppercase tracking-[0.15em] text-black/50">tADA</span>
            </div>
          </div>
        </div>
        {walletState.balance < 5 && (
          <div className="mt-4 border-2 border-orange-400 bg-orange-50 p-3">
            <p className="text-[10px] uppercase tracking-[0.2em] text-orange-700">
              ⚠ Low balance — cần ít nhất ~2 tADA để mint. Get tADA từ{' '}
              <a
                href="https://docs.cardano.org/cardano-testnets/tools/faucet/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2"
              >
                Cardano Faucet ↗
              </a>
            </p>
          </div>
        )}
      </div>
    );
  }

  // ─── Render: ready to connect ────────────────────────────────
  return (
    <div className="border-2 border-black bg-white p-6">
      <div className="flex items-baseline gap-3 mb-4">
        <span className="text-[11px] uppercase tracking-[0.25em] text-black/50">Wallet Detected</span>
        <span className="h-px flex-1 bg-black/20" />
      </div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <p className="text-lg mb-1" style={{ fontFamily: "'Instrument Serif', serif" }}>
            Eternl wallet <em className="italic text-[#0033AD]">ready</em>.
          </p>
          <p className="text-[11px] uppercase tracking-[0.15em] text-black/50">
            CIP-30 · Preprod network · Browser extension
          </p>
        </div>
        <button
          type="button"
          onClick={connectWallet}
          disabled={isConnecting}
          className={`bg-black text-[#FAFAF7] px-8 py-4 text-sm uppercase tracking-[0.2em] border-2 border-black transition-all shrink-0 ${
            isConnecting ? 'opacity-60 cursor-wait' : 'hover:bg-[#0033AD] hover:border-[#0033AD]'
          }`}
        >
          {isConnecting ? (
            <span className="flex items-center gap-3">
              <span
                className="w-4 h-4 border-2 border-white/30 border-t-white animate-spin"
                style={{ borderRadius: '50%' }}
              />
              Connecting...
            </span>
          ) : (
            'Connect Eternl →'
          )}
        </button>
      </div>
      {error && (
        <div className="mt-4 border-2 border-red-600 bg-red-50 p-4">
          <div className="text-[10px] uppercase tracking-[0.2em] text-red-700 mb-1">✗ Connection Error</div>
          <div className="text-sm text-red-900 font-mono">{error}</div>
        </div>
      )}
    </div>
  );
}
