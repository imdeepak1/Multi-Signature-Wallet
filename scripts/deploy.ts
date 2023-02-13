import { ethers } from "hardhat";

async function main() {
 
  const MultiSigWallet = await ethers.getContractFactory("MultiSigWallet");
  const MultiSig = await MultiSigWallet.deploy(["0xAb8483F64d9C6d1EcF9b849Ae677dD3315835cb2","0x4B20993Bc481177ec7E8f571ceCaE8A9e22C02db"],2);

  await MultiSig.deployed();

  console.log(`Multi Signature Wallet delpoyed`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
