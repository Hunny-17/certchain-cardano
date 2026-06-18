import { getVaultScript, getWalletContext } from "./vault-lib.mjs";

const { address, ownerPkh } = await getWalletContext();
const { scriptAddress } = getVaultScript(ownerPkh);

console.log(JSON.stringify({ ownerAddress: address, ownerPkh, scriptAddress }, null, 2));
