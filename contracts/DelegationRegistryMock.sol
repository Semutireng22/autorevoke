// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Types} from "./lib/Types.sol";
import {ICaveatEnforcer} from "./interfaces/ICaveatEnforcer.sol";

/// @notice Minimal mock inspired by MetaMask Delegation Toolkit registry: https://docs.metamask.io/delegation-toolkit/concepts/smart-accounts/
contract DelegationRegistryMock {
    mapping(bytes32 => bool) public active;
    mapping(bytes32 => Types.Delegation) public delegations;
    mapping(bytes32 => Types.Caveat[]) private _caveats;

    event DelegationCreated(bytes32 indexed delegationHash, address indexed delegator, address indexed delegate);
    event DelegationRevoked(bytes32 indexed delegationHash);
    event DelegationRedeemed(bytes32 indexed delegationHash);

    function createDelegation(Types.Delegation calldata delegation, Types.Caveat[] calldata caveats) external {
        require(delegation.delegator == msg.sender, "ONLY_DELEGATOR");
        bytes32 hash = Types.delegationHash(delegation, caveats);
        delegations[hash] = delegation;
        delete _caveats[hash];
        for (uint256 i = 0; i < caveats.length; i++) {
            _caveats[hash].push(caveats[i]);
        }
        active[hash] = true;
        emit DelegationCreated(hash, delegation.delegator, delegation.delegate);
    }

    function revoke(bytes32 delegationHash) external {
        require(active[delegationHash], "NOT_ACTIVE");
        Types.Delegation memory delegation = delegations[delegationHash];
        require(msg.sender == delegation.delegator || msg.sender == delegation.delegate || msg.sender == tx.origin, "UNAUTHORIZED");
        active[delegationHash] = false;
        emit DelegationRevoked(delegationHash);
    }

    function redeem(bytes32 delegationHash, bytes calldata context) external {
        require(active[delegationHash], "NOT_ACTIVE");
        Types.Caveat[] storage caveats = _caveats[delegationHash];
        for (uint256 i = 0; i < caveats.length; i++) {
            ICaveatEnforcer(caveats[i].enforcer).validateCaveat(delegationHash, caveats[i].data, context);
        }
        emit DelegationRedeemed(delegationHash);
    }

    function caveats(bytes32 delegationHash) external view returns (Types.Caveat[] memory) {
        return _caveats[delegationHash];
    }
}
