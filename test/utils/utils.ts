
import { Signer } from 'ethers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { ethers } from 'hardhat';

export const a = (account: SignerWithAddress | Signer) => {
  return account.getAddress().then((res: string) => {
    return res.toString();
  });
};

export async function setCurrentTime(time: any): Promise<any> {
  return await ethers.provider.send('evm_mine', [time]);
}

export async function getCurrentTimestamp(): Promise<any> {
  return (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp;
}

export async function snapshot() {
  return await ethers.provider.send('evm_snapshot', [])
}

export async function restore(snapshotId: any) {
  return await ethers.provider.send('evm_revert', [snapshotId])
}

