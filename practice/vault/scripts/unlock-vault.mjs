import { MeshTxBuilder, mConStr0 } from "@meshsdk/core";
import { cardanoscanTx, getVaultScript, getWalletContext } from "./vault-lib.mjs";

const txHashArg = process.argv[2];
const outputIndexArg = process.argv[3];

const { provider, wallet, address, ownerPkh } = await getWalletContext();
const { compiledCode, scriptAddress } = getVaultScript(ownerPkh);

const scriptUtxos = await provider.fetchAddressUTxOs(scriptAddress);
const target = scriptUtxos.find((u) => {
  const matchesInput = txHashArg
    ? u.input.txHash === txHashArg &&
      (outputIndexArg === undefined || u.input.outputIndex === Number(outputIndexArg))
    : true;
  return matchesInput && u.output.plutusData;
});

if (!target) {
  throw new Error("No vault UTxO with inline datum found. Pass lock tx hash/output index if needed.");
}

const walletUtxos = await provider.fetchAddressUTxOs(address);
const collateral = walletUtxos.find(
  (u) =>
    !u.output.referenceScript &&
    u.output.amount.length === 1 &&
    u.output.amount[0].unit === "lovelace" &&
    Number(u.output.amount[0].quantity) >= 5_000_000,
);
if (!collateral) throw new Error("No pure-ADA collateral UTxO >= 5 ADA found");

const spendable = walletUtxos.filter(
  (u) =>
    !u.output.referenceScript &&
    !(u.input.txHash === collateral.input.txHash &&
      u.input.outputIndex === collateral.input.outputIndex),
);

const txBuilder = new MeshTxBuilder({
  fetcher: provider,
  submitter: provider,
  evaluator: provider,
});
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
  .txInRedeemerValue(mConStr0([]), "Mesh")
  .requiredSignerHash(ownerPkh);

const unsignedTx = await txBuilder
  .changeAddress(address)
  .selectUtxosFrom(spendable)
  .complete();

const signedTx = await wallet.signTx(unsignedTx);
const txHash = await wallet.submitTx(signedTx);

console.log(JSON.stringify({
  txHash,
  spentInput: `${target.input.txHash}#${target.input.outputIndex}`,
  scriptAddress,
  ownerPkh,
  cardanoscan: cardanoscanTx(txHash),
}, null, 2));
