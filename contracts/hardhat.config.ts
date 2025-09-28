import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  defaultNetwork: "hardhat",
  networks: {
    monad: {
      url: process.env.RPC_URL || "https://testnet-rpc.monad.xyz/",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : undefined,
      chainId: 20143
    }
  },
  paths: {
    sources: "./",
    tests: "./test",
    cache: "../cache",
    artifacts: "../artifacts"
  },
  typechain: {
    outDir: "../typechain",
    target: "ethers-v6"
  }
};

export default config;
