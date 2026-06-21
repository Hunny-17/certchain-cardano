import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  applyParamsToScript,
  BlockfrostProvider,
  MeshWallet,
  resolvePaymentKeyHash,
  resolvePlutusScriptAddress,
  resolveScriptHash,
} from "@meshsdk/core";

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, "../../..");
const FRONTEND_ENV = join(ROOT, "frontend/.env");
const BLUEPRINT = join(__dir, "../plutus.json");

export function loadEnv() {
  const env = {};
  for (const line of readFileSync(FRONTEND_ENV, "utf8").split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx < 1) continue;
    let value = line.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[line.slice(0, idx).trim()] = value;
  }
  return env;
}

export async function getWalletContext() {
  const env = loadEnv();
  const blockfrostKey = env.BLOCKFROST_KEY || env.BLOCKFROST_PREPROD_KEY;
  if (!blockfrostKey) throw new Error("Missing BLOCKFROST_KEY in frontend/.env");

  const mnemonic = env.CUSTODY_WALLET_MNEMONIC;
  if (!mnemonic) throw new Error("Missing CUSTODY_WALLET_MNEMONIC in frontend/.env");

  const provider = new BlockfrostProvider(blockfrostKey);
  const wallet = new MeshWallet({
    networkId: 0,
    fetcher: provider,
    submitter: provider,
    key: { type: "mnemonic", words: mnemonic.trim().split(/\s+/) },
  });
  const address = await wallet.getChangeAddress();
  const ownerPkh = resolvePaymentKeyHash(address);
  return { env, provider, wallet, address, ownerPkh };
}

export function getVaultScript(ownerPkh) {
  const blueprint = JSON.parse(readFileSync(BLUEPRINT, "utf8"));
  const validator = blueprint.validators.find((v) => v.title === "vault.vault.spend");
  if (!validator) throw new Error("vault.vault.spend not found in plutus.json");

  const parameterized = applyParamsToScript(validator.compiledCode, [ownerPkh], "Mesh");
  const compiledCode = parameterized;
  const scriptAddress = resolvePlutusScriptAddress({ code: compiledCode, version: "V3" }, 0);
  const scriptHash = resolveScriptHash(compiledCode, "V3");
  return {
    rawCode: validator.compiledCode,
    parameterizedCode: parameterized,
    compiledCode,
    scriptAddress,
    scriptHash,
    scriptSize: String(Buffer.from(compiledCode, "hex").length),
  };
}

export function cardanoscanTx(txHash) {
  return `https://preprod.cardanoscan.io/transaction/${txHash}`;
}
