import { MeshTxBuilder } from "@meshsdk/core";
import { cardanoscanTx, getSwapContext } from "./swap-lib.mjs";

const lovelace = process.argv[2] ?? "10000000";
if (!/^\d+$/.test(lovelace) || BigInt(lovelace) < 5000000n) throw new Error("Funding must be at least 5 ADA");

const { provider, wallet, sellerAddress, sellerPkh, buyerAddress, buyerPkh } = await getSwapContext();
const utxos = await provider.fetchAddressUTxOs(sellerAddress);
const txBuilder = new MeshTxBuilder({ fetcher: provider, submitter: provider });
const unsignedTx = await txBuilder
  .txOut(buyerAddress, [{ unit: "lovelace", quantity: lovelace }])
  .requiredSignerHash(sellerPkh)
  .setFee("250000")
  .changeAddress(sellerAddress)
  .selectUtxosFrom(utxos)
  .complete();
const signedTx = await wallet.signTx(unsignedTx);
const txHash = await wallet.submitTx(signedTx);
console.log(JSON.stringify({ txHash, buyerAddress, buyerPkh, lovelace, cardanoscan: cardanoscanTx(txHash) }, null, 2));
