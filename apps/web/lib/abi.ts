export const delegationRegistryAbi = [
  // Delegation creation referencing ERC-7710 data model: https://eips.ethereum.org/EIPS/eip-7710
  {
    inputs: [
      {
        components: [
          { internalType: "address", name: "delegator", type: "address" },
          { internalType: "address", name: "delegate", type: "address" },
          { internalType: "bytes32", name: "salt", type: "bytes32" },
          { internalType: "bytes", name: "data", type: "bytes" }
        ],
        internalType: "struct Types.Delegation",
        name: "delegation",
        type: "tuple"
      },
      {
        components: [
          { internalType: "address", name: "enforcer", type: "address" },
          { internalType: "bytes", name: "data", type: "bytes" }
        ],
        internalType: "struct Types.Caveat[]",
        name: "caveats",
        type: "tuple[]"
      }
    ],
    name: "createDelegation",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { internalType: "bytes32", name: "delegationHash", type: "bytes32" },
      { internalType: "bytes", name: "context", type: "bytes" }
    ],
    name: "redeem",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  }
] as const;

export const autoRevokerAbi = [
  {
    inputs: [{ internalType: "bytes32", name: "delegationHash", type: "bytes32" }],
    name: "revoke",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  }
] as const;
