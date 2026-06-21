import { MeshTxBuilder, mConStr0 } from "@meshsdk/core";
import { cardanoscanTx, getSwapContext, getSwapScript } from "./swap-lib.mjs";

const lockTxHash = process.argv[2];
const outputIndexArg = process.argv[3];
if (!lockTxHash) throw new Error("Usage: node scripts/buy-swap.mjs <lock-tx-hash> [output-index] [price-lovelace]");

const { provider, buyerWallet, sellerAddress, buyerAddress, buyerPkh } = await getSwapContext();
const { compiledCode, scriptAddress } = getSwapScript();
const scriptUtxos = await provider.fetchAddressUTxOs(scriptAddress);
const target = scriptUtxos.find((utxo) =>
  utxo.input.txHash === lockTxHash &&
  (outputIndexArg === undefined || utxo.input.outputIndex === Number(outputIndexArg)) &&
  utxo.output.plutusData,
);
if (!target) throw new Error("No matching swap UTxO with inline datum found");

const price = Number(process.argv[4] ?? "3000000");
if (!Number.isSafeInteger(price) || price <= 0) throw new Error("Price must be a positive integer lovelace amount");
const nft = target.output.amount.find((asset) => asset.unit !== "lovelace" && asset.quantity === "1");
if (!nft) throw new Error("Escrow UTxO does not contain an NFT");

const walletUtxos = await provider.fetchAddressUTxOs(buyerAddress);
const collateral = walletUtxos.find((utxo) =>
  !utxo.output.referenceScript &&
  utxo.output.amount.length === 1 &&
  utxo.output.amount[0].unit === "lovelace" &&
  Number(utxo.output.amount[0].quantity) >= 5_000_000,
);
if (!collateral) throw new Error("No pure-ADA collateral UTxO >= 5 ADA found");
const spendable = walletUtxos.filter((utxo) =>
  !utxo.output.referenceScript &&
  !(utxo.input.txHash === collateral.input.txHash && utxo.input.outputIndex === collateral.input.outputIndex),
);

const txBuilder = new MeshTxBuilder({ fetcher: provider, submitter: provider });
txBuilder.txInCollateral(
  collateral.input.txHash,
  collateral.input.outputIndex,
  collateral.output.amount,
  collateral.output.address,
);
txBuilder
  .spendingPlutusScriptV3()
  .txIn(target.input.txHash, target.input.outputIndex, target.output.amount, target.output.address)
  .txInScript(compiledCode)
  .txInInlineDatumPresent()
  .txInRedeemerValue(mConStr0([buyerPkh]), "Mesh", { mem: 1000000, steps: 1000000000 })
  .requiredSignerHash(buyerPkh)
  .txOut(sellerAddress, [{ unit: "lovelace", quantity: String(price) }])
  .txOut(buyerAddress, target.output.amount)
  .setFee("500000");

const unsignedTx = await txBuilder
  .changeAddress(buyerAddress)
  .selectUtxosFrom(spendable)
  .complete();
const signedTx = await buyerWallet.signTx(unsignedTx);
const txHash = await buyerWallet.submitTx(signedTx);
console.log(JSON.stringify({
  txHash,
  spentInput: `${target.input.txHash}#${target.input.outputIndex}`,
  nft: nft.unit,
  price,
  buyerAddress,
  cardanoscan: cardanoscanTx(txHash),
}, null, 2));
