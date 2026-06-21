import { MeshTxBuilder, mConStr0 } from "@meshsdk/core";
import { cardanoscanTx, getSwapContext, getSwapScript, parseAssetUnit } from "./swap-lib.mjs";

const unit = process.argv[2];
const price = Number(process.argv[3] ?? "3000000");
if (!unit) throw new Error("Usage: node scripts/lock-swap.mjs <asset-unit> [price-lovelace]");
if (!Number.isSafeInteger(price) || price <= 0) throw new Error("Price must be a positive integer lovelace amount");

const { provider, wallet, sellerAddress, sellerPkh } = await getSwapContext();
const { policyId } = parseAssetUnit(unit);
const { scriptAddress } = getSwapScript();
const utxos = await provider.fetchAddressUTxOs(sellerAddress);
const nftUtxo = utxos.find((utxo) => utxo.output.amount.some((asset) => asset.unit === unit && asset.quantity === "1"));
if (!nftUtxo) throw new Error(`Wallet does not hold NFT ${unit}`);

const datum = mConStr0([sellerPkh, BigInt(price), policyId]);
const txBuilder = new MeshTxBuilder({ fetcher: provider, submitter: provider });
const unsignedTx = await txBuilder
  .txOut(scriptAddress, [
    { unit: "lovelace", quantity: "2000000" },
    { unit, quantity: "1" },
  ])
  .txOutInlineDatumValue(datum, "Mesh")
  .requiredSignerHash(sellerPkh)
  .setFee("250000")
  .changeAddress(sellerAddress)
  .selectUtxosFrom(utxos)
  .complete();

const signedTx = await wallet.signTx(unsignedTx);
const txHash = await wallet.submitTx(signedTx);
console.log(JSON.stringify({
  txHash,
  unit,
  price,
  scriptAddress,
  sellerPkh,
  cardanoscan: cardanoscanTx(txHash),
}, null, 2));
