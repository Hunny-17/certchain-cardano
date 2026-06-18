import { MeshTxBuilder, mConStr0 } from "@meshsdk/core";
import { cardanoscanTx, getVaultScript, getWalletContext } from "./vault-lib.mjs";

const lovelace = process.argv[2] ?? "2000000";
const note = process.argv[3] ?? `vault-practice-${Date.now().toString(36)}`;

const { provider, wallet, address, ownerPkh } = await getWalletContext();
const { scriptAddress } = getVaultScript(ownerPkh);

const datum = mConStr0([Buffer.from(note, "utf8").toString("hex")]);
const utxos = await provider.fetchAddressUTxOs(address);

const txBuilder = new MeshTxBuilder({ fetcher: provider, submitter: provider });
const unsignedTx = await txBuilder
  .txOut(scriptAddress, [{ unit: "lovelace", quantity: lovelace }])
  .txOutInlineDatumValue(datum, "Mesh")
  .changeAddress(address)
  .selectUtxosFrom(utxos)
  .complete();

const signedTx = await wallet.signTx(unsignedTx);
const txHash = await wallet.submitTx(signedTx);

console.log(JSON.stringify({
  txHash,
  scriptAddress,
  ownerPkh,
  lovelace,
  note,
  cardanoscan: cardanoscanTx(txHash),
}, null, 2));
