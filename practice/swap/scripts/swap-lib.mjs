import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  applyCborEncoding,
  BlockfrostProvider,
  MeshWallet,
  resolveNativeScriptHash,
  resolvePaymentKeyHash,
  resolvePlutusScriptAddress,
  serializeNativeScript,
} from "@meshsdk/core";

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, "../../..");
const FRONTEND_ENV = join(ROOT, "frontend/.env");
const BLUEPRINT = join(__dir, "../plutus.json");

export function loadEnv() {
  const env = {};
  for (const line of readFileSync(FRONTEND_ENV, "utf8").split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator < 1) continue;
    let value = line.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[line.slice(0, separator).trim()] = value;
  }
  return env;
}

export async function getSwapContext() {
  const env = loadEnv();
  const blockfrostKey = env.BLOCKFROST_KEY || env.BLOCKFROST_PREPROD_KEY;
  const mnemonic = env.CUSTODY_WALLET_MNEMONIC;
  if (!blockfrostKey || !mnemonic) throw new Error("Missing Blockfrost key or custody mnemonic in frontend/.env");

  const provider = new BlockfrostProvider(blockfrostKey);
  const words = mnemonic.trim().split(/\s+/);
  const wallet = new MeshWallet({
    networkId: 0,
    fetcher: provider,
    submitter: provider,
    key: { type: "mnemonic", words },
  });
  const buyerWallet = new MeshWallet({
    networkId: 0,
    fetcher: provider,
    submitter: provider,
    key: { type: "mnemonic", words },
    keyIndex: 1,
  });
  const sellerAddress = await wallet.getChangeAddress();
  const buyerAddress = await buyerWallet.getChangeAddress();
  return {
    provider,
    wallet,
    buyerWallet,
    sellerAddress,
    sellerPkh: resolvePaymentKeyHash(sellerAddress),
    buyerAddress,
    buyerPkh: resolvePaymentKeyHash(buyerAddress),
  };
}

export function getSwapScript() {
  const blueprint = JSON.parse(readFileSync(BLUEPRINT, "utf8"));
  const validator = blueprint.validators.find((item) => item.title === "swap.swap.spend");
  if (!validator) throw new Error("swap.swap.spend not found in plutus.json");

  const compiledCode = applyCborEncoding(validator.compiledCode);
  return {
    compiledCode,
    scriptAddress: resolvePlutusScriptAddress({ code: compiledCode, version: "V3" }, 0),
  };
}

export function makeTestNftPolicy(sellerPkh) {
  const nativeScript = { type: "sig", keyHash: sellerPkh };
  const { scriptCbor } = serializeNativeScript(nativeScript);
  if (!scriptCbor) throw new Error("Could not serialize native test NFT policy");
  return { nativeScript, scriptCbor, policyId: resolveNativeScriptHash(nativeScript) };
}

export function parseAssetUnit(unit) {
  if (!/^[0-9a-f]+$/i.test(unit) || unit.length <= 56) throw new Error("Expected an asset unit: 56-char policy id plus hex asset name");
  return { policyId: unit.slice(0, 56), assetName: unit.slice(56) };
}

export function cardanoscanTx(txHash) {
  return `https://preprod.cardanoscan.io/transaction/${txHash}`;
}
