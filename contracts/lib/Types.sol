// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Shared structs for Delegation Toolkit-style flows referencing ERC-7710: https://eips.ethereum.org/EIPS/eip-7710
library Types {
    struct Delegation {
        address delegator;
        address delegate;
        bytes32 salt;
        bytes data;
    }

    struct Caveat {
        address enforcer;
        bytes data;
    }

    function delegationHash(Delegation memory d, Caveat[] memory caveats) internal pure returns (bytes32) {
        bytes memory encodedCaveats;
        for (uint256 i = 0; i < caveats.length; i++) {
            encodedCaveats = bytes.concat(encodedCaveats, abi.encode(caveats[i].enforcer, keccak256(caveats[i].data)));
        }
        return keccak256(abi.encode(d.delegator, d.delegate, d.salt, keccak256(d.data), keccak256(encodedCaveats)));
    }
}
