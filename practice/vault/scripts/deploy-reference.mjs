import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { MeshTxBuilder } from "@meshsdk/core";
import { cardanoscanTx, getVaultScript, getWalletContext } from "./vault-lib.mjs";

const __dir = dirname(fileURLToPath(import.meta.url));
const outputPath = join(__dir, "../preprod-deployment.json");

const { provider, wallet, address, ownerPkh } = await getWalletContext();
const { compiledCode, scriptAddress, scriptHash, scriptSize } = getVaultScript(ownerPkh);
const utxos = await provider.fetchAddressUTxOs(address);

const txBuilder = new MeshTxBuilder({ fetcher: provider, submitter: provider });
const unsignedTx = await txBuilder
  .txOut(address, [{ unit: "lovelace", quantity: "5000000" }])
  .txOutReferenceScript(compiledCode, "V3")
  .setFee("350000")
  .changeAddress(address)
  .selectUtxosFrom(utxos)
  .complete();

const signedTx = await wallet.signTx(unsignedTx);
const txHash = await wallet.submitTx(signedTx);

const deployment = {
  refTxHash: txHash,
  refTxIndex: 0,
  ownerPkh,
  scriptAddress,
  scriptHash,
  scriptSize,
  deployedAt: new Date().toISOString(),
  network: "preprod",
};
writeFileSync(outputPath, JSON.stringify(deployment, null, 2));

console.log(JSON.stringify({
  ...deployment,
  cardanoscan: cardanoscanTx(txHash),
}, null, 2));
