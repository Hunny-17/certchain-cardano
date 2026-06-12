/**
 * api/_lib/pinata.ts
 * ──────────────────────────────────────────────────────────────────
 * Pinata SDK singleton for IPFS uploads.
 * Backend only — PINATA_JWT must never be exposed to the browser.
 * ──────────────────────────────────────────────────────────────────
 */

import { PinataSDK } from "pinata";

let _pinata: PinataSDK | null = null;

export function getPinataClient(): PinataSDK {
  if (_pinata) return _pinata;

  const jwt = process.env.PINATA_JWT;
  if (!jwt) throw new Error("Missing PINATA_JWT in environment");

  _pinata = new PinataSDK({
    pinataJwt: jwt,
    pinataGateway: "gateway.pinata.cloud",
  });

  return _pinata;
}
