// File: lib/fetchSource.ts
import axios from "axios";
import fs from "fs/promises";
import path from "path";
import { isAddress, InfuraProvider } from "ethers";
import { Provider } from "ethers";
import { ethers } from "ethers";

const ETHERSCAN_KEYS: Record<string, string|undefined> = {
  mainnet: process.env.ETHERSCAN_API_KEY,
  goerli: process.env.ETHERSCAN_API_KEY,
  sepolia: process.env.ETHERSCAN_API_KEY,
};

function etherscanHostFor(network: string) {
  if (network === "mainnet") return "https://api.etherscan.io/api";
  if (network === "goerli") return "https://api-goerli.etherscan.io/api";
  if (network === "sepolia") return "https://api-sepolia.etherscan.io/api";
  return "https://api.etherscan.io/api";
}

export async function fetchVerifiedSource(address: string, network = "mainnet") {
   if (!isAddress(address)) throw new Error("Invalid address");

  // 1) Try Etherscan
  const host = etherscanHostFor(network);
  const apiKey = ETHERSCAN_KEYS[network] || ETHERSCAN_KEYS["mainnet"];
  try {
    const resp = await axios.get(host, {
      params: {
        module: "contract",
        action: "getsourcecode",
        address,
        apikey: apiKey,
      },
    });
    const result = resp.data?.result?.[0];
    if (result && result.SourceCode && result.SourceCode !== "") {
      // SourceCode can be a string or a JSON wrapper for multi-file
      return {
        foundOn: "etherscan",
        source: result.SourceCode,
        contractName: result.ContractName,
        compilerVersion: result.CompilerVersion,
        optimizationUsed: result.OptimizationUsed, // "1" or "0"
        evmVersion: result.EVMVersion,
        abi: result.ABI,
        raw: result,
      };
    }
  } catch (err) {
    const errorMsg = typeof err === "object" && err !== null && "message" in err ? (err as any).message : String(err);
    console.warn("Etherscan fetch failed:", errorMsg);
  }

  // 2) Try Sourcify (fallback)
  try {
    // chainId: mainnet=1, goerli=5, sepolia=11155111
    const CHAIN_MAP: Record<string, number> = {
      mainnet: 1,
      goerli: 5,
      sepolia: 11155111,
    };
    const chainId = CHAIN_MAP[network] ?? 1;
    // Sourcify has files endpoint; try to fetch compiled sources
    const sourcifyUrl = https://repo.sourcify.dev/contracts/full_match/${chainId}/${address}/;
    const listResp = await axios.get(sourcifyUrl);
    // If we get HTML index or files, attempt to fetch the Solidity file(s)
    if (listResp.status === 200) {
      return {
        foundOn: "sourcify",
        source: listResp.data,
        raw: listResp.data,
      };
    }
  } catch (err) {
    const sourcifyErrorMsg = typeof err === "object" && err !== null && "message" in err ? (err as any).message : String(err);
    console.warn("Sourcify fetch failed:", sourcifyErrorMsg);
  }

  // 3) Fallback: fetch on-chain runtime bytecode
  try {
    const provider = new ethers.InfuraProvider(network, process.env.INFURA_KEY);
    const code = await provider.getCode(address);
    return {
      foundOn: "onchain",
      bytecode: code,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("Failed to fetch on-chain code:", errorMsg);
    return { foundOn: "none" };
  }
}

/**
 * Save source to disk in a folder and return path info
 */
export async function saveSourcePayload(payload: any, address: string) {
  const base: string = path.resolve("./tmp-sources");
  await fs.mkdir(base, { recursive: true });

  if (payload.foundOn === "etherscan") {
    const raw = payload.source;
    // Etherscan sometimes returns a JSON wrapper for multi-file sources:
    // If it starts with '{' it may be JSON
    if (raw.trim().startsWith("{")) {
      // attempt to parse - Etherscan multi-file uses JSON like {"<filename>": {"content":"..."}}
      try {
        const parsed = JSON.parse(raw);
        // If it's the "sources" mapping (solc standard JSON verified format)
        if (parsed.sources) {
          // Flatten into single file (simple approach)
          let flat = "";
          for (const f in parsed.sources) {
            flat += `// ===== ${f} =====\n${parsed.sources[f].content}\n\n`;
          }
          const filename = `${base}/${address}.sol`;
          await fs.writeFile(filename, flat, "utf8");
          return { path: filename, type: "sol" };
        }
      } catch {
        // not JSON; treat as raw solidity
      }
    }
    // treat as raw solidity text
    const filename = `${base}/${address}.sol`;
    await fs.writeFile(filename, raw, "utf8");
    return { path: filename, type: "sol" };
  } else if (payload.foundOn === "sourcify") {
    // Save the raw response (Sourcify structure may require more parsing)
    const filename = `${base}/${address}-sourcify.html`;
    await fs.writeFile(filename, payload.source, "utf8");
    return { path: filename, type: "sourcify" };
  } else if (payload.foundOn === "onchain") {
    const filename = `${base}/${address}-bytecode.txt`;
    await fs.writeFile(filename, payload.bytecode || "0x", "utf8");
    return { path: filename, type: "bytecode" };
  } else {
    throw new Error("No source or bytecode found");
  }
}