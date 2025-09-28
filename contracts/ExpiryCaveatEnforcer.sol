// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ICaveatEnforcer} from "./interfaces/ICaveatEnforcer.sol";

/// @notice Enforces expiry per Delegation Toolkit caveat docs: https://docs.metamask.io/delegation-toolkit/concepts/smart-accounts/
contract ExpiryCaveatEnforcer is ICaveatEnforcer {
    error Expired(bytes32 delegationHash, uint256 nowTs, uint256 expiry);

    function validateCaveat(bytes32 delegationHash, bytes calldata caveatData, bytes calldata) external view override {
        uint256 expiry = abi.decode(caveatData, (uint256));
        if (block.timestamp > expiry) {
            revert Expired(delegationHash, block.timestamp, expiry);
        }
    }
}
