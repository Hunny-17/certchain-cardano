/**
 * src/pages/v3/V3Demo.tsx
 * ────────────────────────────────────────────────────────────────
 * V3 CIP-30 Wallet Integration Prototype — Demo Page
 *
 * Route: /v3-demo
 * Purpose: Demonstrates issuer wallet flow (Eternl + CIP-30)
 *          for signing CertChain credential NFT mints directly
 *          to a student's wallet on Cardano Preprod.
 *
 * ⚠️ PROTOTYPE — separate branch, does not affect V2 flows.
 * ────────────────────────────────────────────────────────────────
 */

import { Component, lazy, Suspense, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import WalletConnect from '../../components/v3/WalletConnect';
import type { WalletState } from '../../components/v3/WalletConnect';

const MintWithWallet = lazy(() => import('../../components/v3/MintWithWallet'));

class V3ErrorBoundary extends Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

const INITIAL_WALLET_STATE: WalletState = {
  wallet: null,
  address: '',
  balance: 0,
  connected: false,
};

export default function V3Demo() {
  const [walletState, setWalletState] = useState<WalletState>(INITIAL_WALLET_STATE);
  const [showMintForm, setShowMintForm] = useState(false);

  const handleConnect = useCallback((state: WalletState) => {
    setWalletState(state);
    setShowMintForm(false);
  }, []);

  const handleDisconnect = useCallback(() => {
    setWalletState(INITIAL_WALLET_STATE);
    setShowMintForm(false);
  }, []);

  return (
    <div className="min-h-screen bg-[#FAFAF7] text-black font-mono">
      {/* ═══════════════════ HEADER ═══════════════════ */}
      <header className="border-b-2 border-black">
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-5 flex items-center justify-between">
          <Link to="/" className="flex items-baseline gap-3">
            <span
              className="text-2xl tracking-tight"
              style={{ fontFamily: "'Instrument Serif', serif" }}
            >
              CertChain
            </span>
            <span className="text-[10px] uppercase tracking-[0.2em] text-black/50">
              · Cardano
            </span>
          </Link>
          <nav className="flex items-center gap-4">
            <span className="text-[11px] uppercase tracking-[0.15em] text-black/40">
              V3 Demo
            </span>
            <span className="text-black/20">/</span>
            <span className="text-[11px] uppercase tracking-[0.15em]">
              CIP-30 Wallet
            </span>
          </nav>
        </div>
      </header>

      {/* ═══════════════════ PROTOTYPE BADGE ═══════════════════ */}
      <div className="bg-[#0033AD] text-white">
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 bg-white animate-pulse inline-block" />
            <span className="text-[10px] uppercase tracking-[0.25em]">
              V3 Prototype · Feature Branch · Not Production
            </span>
          </div>
          <Link
            to="/"
            className="text-[10px] uppercase tracking-[0.2em] text-white/70 hover:text-white transition-colors"
          >
            ← Back to V2
          </Link>
        </div>
      </div>

      {/* ═══════════════════ MAIN ═══════════════════ */}
      <main className="max-w-7xl mx-auto px-6 md:px-10 py-12 md:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16">
          {/* ── LEFT COLUMN: Wallet + Mint ── */}
          <section className="lg:col-span-7">
            {/* Title */}
            <div className="flex items-baseline gap-4 mb-2">
              <span className="text-[11px] uppercase tracking-[0.25em] text-black/50">
                V3 Preview
              </span>
              <span className="h-px flex-1 bg-black/20" />
            </div>

            <h1
              className="text-5xl md:text-7xl leading-[0.95] mb-4"
              style={{ fontFamily: "'Instrument Serif', serif", fontWeight: 400 }}
            >
              Issue with{' '}
              <em className="italic text-[#0033AD]">your wallet</em>.
            </h1>

            <p className="text-sm text-black/60 mb-12 max-w-md leading-relaxed">
              Connect the issuer Eternl wallet (CIP-30), enter a student's wallet
              address, then sign the credential NFT mint on Cardano Preprod.
              No custody wallet — the issuer owns the signing key.
            </p>

            {/* Wallet Connect */}
            <div className="mb-10">
              <WalletConnect
                onConnect={handleConnect}
                onDisconnect={handleDisconnect}
                walletState={walletState}
              />
            </div>

            {/* Mint Form — only shows when wallet connected */}
            {walletState.connected && walletState.wallet && (
              <div className="animate-reveal">
                {!showMintForm ? (
                  <div className="border-2 border-black bg-white p-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.25em] text-[#0033AD] mb-2">
                          Wallet Connected
                        </div>
                        <p className="text-sm text-black/60 leading-relaxed">
                          Issuer wallet access granted. Load the form when you are ready to mint a credential NFT to a student wallet.
                        </p>
                      </div>
                      <button
                        onClick={() => setShowMintForm(true)}
                        className="bg-black text-[#FAFAF7] px-6 py-4 text-sm uppercase tracking-[0.2em] border-2 border-black hover:bg-[#0033AD] hover:border-[#0033AD] transition-colors"
                      >
                        Load Mint Form
                      </button>
                    </div>
                  </div>
                ) : (
                  <V3ErrorBoundary
                    fallback={
                      <div className="border-2 border-orange-400 bg-orange-50 p-6">
                        <div className="text-[11px] uppercase tracking-[0.25em] text-orange-700 mb-2">
                          Mint module did not load
                        </div>
                        <p className="text-sm text-orange-900 leading-relaxed">
                          Wallet connect is proven. Reload the page and use this as the V3 connect demo if the Mesh transaction module fails in this browser bundle.
                        </p>
                      </div>
                    }
                  >
                    <Suspense
                  fallback={
                    <div className="border-2 border-black bg-white p-6">
                      <span className="text-[11px] uppercase tracking-[0.2em] text-black/50">
                        Loading mint module...
                      </span>
                    </div>
                  }
                >
                  <MintWithWallet
                    wallet={walletState.wallet}
                    walletAddress={walletState.address}
                  />
                    </Suspense>
                  </V3ErrorBoundary>
                )}
              </div>
            )}

            {/* Placeholder when not connected */}
            {!walletState.connected && (
              <div className="border-2 border-dashed border-black/20 p-8 text-center">
                <p
                  className="text-xl text-black/30 mb-2"
                  style={{ fontFamily: "'Instrument Serif', serif" }}
                >
                  Connect wallet to start minting
                </p>
                <p className="text-[11px] uppercase tracking-[0.2em] text-black/20">
                  Eternl · CIP-30 · Preprod Network
                </p>
              </div>
            )}
          </section>

          {/* ── RIGHT COLUMN: Info Panel ── */}
          <aside className="lg:col-span-5">
            <div className="lg:sticky lg:top-12 space-y-6">
              {/* How it works */}
              <div className="flex items-baseline gap-3 mb-2">
                <span className="text-[10px] uppercase tracking-[0.25em] text-black/50">
                  How It Works
                </span>
                <span className="h-px flex-1 bg-black/20" />
              </div>

              <div className="border-2 border-black bg-white">
                {[
                  {
                    step: '01',
                    title: 'Connect Wallet',
                    desc: 'Eternl extension detected → CIP-30 enable request',
                  },
                  {
                    step: '02',
                    title: 'Fill Credential Form',
                    desc: 'Student address, recipient, title → CIP-25 metadata',
                  },
                  {
                    step: '03',
                    title: 'Sign & Submit',
                    desc: 'Eternl popup → approve tx → broadcast to Preprod',
                  },
                  {
                    step: '04',
                    title: 'NFT in Student Wallet',
                    desc: 'Credential NFT minted directly to the student address',
                  },
                ].map((item) => (
                  <div
                    key={item.step}
                    className="flex gap-4 px-5 py-4 border-b-2 border-black last:border-b-0"
                  >
                    <div className="w-8 h-8 border-2 border-black flex items-center justify-center text-[11px] font-mono shrink-0">
                      {item.step}
                    </div>
                    <div>
                      <div
                        className="text-base"
                        style={{ fontFamily: "'Instrument Serif', serif" }}
                      >
                        {item.title}
                      </div>
                      <div className="text-[10px] uppercase tracking-[0.15em] text-black/50 mt-1">
                        {item.desc}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* V2 vs V3 comparison */}
              <div className="border-2 border-black bg-white">
                <div className="px-5 py-3 border-b-2 border-black bg-black text-[#FAFAF7]">
                  <span className="text-[10px] uppercase tracking-[0.25em]">
                    V2 → V3 Architecture Shift
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-px bg-black">
                  <div className="bg-[#FAFAF7] p-4">
                    <div className="text-[10px] uppercase tracking-[0.25em] text-black/50 mb-2">
                      V2 (Current)
                    </div>
                    <ul className="space-y-1 text-[11px] text-black/70">
                      <li>• Custody wallet</li>
                      <li>• Server-side signing</li>
                      <li>• Claim code flow</li>
                      <li>• Centralized mint</li>
                    </ul>
                  </div>
                  <div className="bg-[#0033AD]/5 p-4">
                    <div className="text-[10px] uppercase tracking-[0.25em] text-[#0033AD] mb-2">
                      V3 (This Demo)
                    </div>
                    <ul className="space-y-1 text-[11px] text-[#0033AD]/80">
                      <li>• User wallet (CIP-30)</li>
                      <li>• Browser signing</li>
                      <li>• Direct to student wallet</li>
                      <li>• Self-sovereign</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Requirements */}
              <div className="border-2 border-black/30 bg-white p-5">
                <div className="text-[10px] uppercase tracking-[0.25em] text-black/50 mb-3">
                  Requirements
                </div>
                <ul className="space-y-2 text-sm text-black/70">
                  <li className="flex items-start gap-2">
                    <span className="text-[#0033AD] mt-0.5">→</span>
                    <span>Eternl browser extension installed</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#0033AD] mt-0.5">→</span>
                    <span>Switched to <strong>Preprod</strong> network</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#0033AD] mt-0.5">→</span>
                    <span>~5 tADA balance for transaction fees</span>
                  </li>
                </ul>
                <a
                  href="https://docs.cardano.org/cardano-testnets/tools/faucet/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-3 text-[10px] uppercase tracking-[0.2em] text-[#0033AD] underline underline-offset-2 hover:text-black transition-colors"
                >
                  Get test ADA from faucet ↗
                </a>
              </div>
            </div>
          </aside>
        </div>
      </main>

      {/* ═══════════════════ FOOTER ═══════════════════ */}
      <footer className="border-t-2 border-black mt-20">
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-3 flex items-center justify-between text-[10px] uppercase tracking-[0.2em]">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 bg-[#0033AD] inline-block" />
              Preprod Network
            </span>
            <span className="text-black/40">CIP-30 · CIP-25</span>
          </div>
          <span className="text-black/40">
            V3 Prototype · Mesh.js v1.8 · Browser Wallet
          </span>
        </div>
      </footer>
    </div>
  );
}
