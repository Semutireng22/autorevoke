// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IDelegationRegistry} from "./interfaces/IDelegationRegistry.sol";

/// @notice Guardian helper for MetaMask Smart Accounts automation referencing ERC-4337 bundlers: https://docs.metamask.io/smart-accounts/overview/
contract AutoRevoker {
    address public immutable registry;

    event AutoRevoked(bytes32 indexed delegationHash);

    constructor(address registryAddress) {
        registry = registryAddress;
    }

    function revoke(bytes32 delegationHash) external {
        IDelegationRegistry(registry).revoke(delegationHash);
        emit AutoRevoked(delegationHash);
    }
}
