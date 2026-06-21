import { MeshTxBuilder } from "@meshsdk/core";
import { cardanoscanTx, getSwapContext, makeTestNftPolicy } from "./swap-lib.mjs";

const tokenLabel = process.argv[2] ?? `swap-a5-${Date.now().toString(36)}`;
const tokenName = Buffer.from(tokenLabel, "utf8").toString("hex");
const { provider, wallet, sellerAddress, sellerPkh } = await getSwapContext();
const { policyId, scriptCbor } = makeTestNftPolicy(sellerPkh);
const utxos = await provider.fetchAddressUTxOs(sellerAddress);
const unit = `${policyId}${tokenName}`;

const txBuilder = new MeshTxBuilder({ fetcher: provider, submitter: provider });
const unsignedTx = await txBuilder
  .mint("1", policyId, tokenName)
  .mintingScript(scriptCbor)
  .txOut(sellerAddress, [
    { unit: "lovelace", quantity: "2000000" },
    { unit, quantity: "1" },
  ])
  .requiredSignerHash(sellerPkh)
  .setFee("250000")
  .changeAddress(sellerAddress)
  .selectUtxosFrom(utxos)
  .complete();

const signedTx = await wallet.signTx(unsignedTx);
const txHash = await wallet.submitTx(signedTx);
console.log(JSON.stringify({ txHash, unit, policyId, tokenLabel, cardanoscan: cardanoscanTx(txHash) }, null, 2));
