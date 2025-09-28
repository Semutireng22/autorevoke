// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ICaveatEnforcer} from "./interfaces/ICaveatEnforcer.sol";

/// @notice Spend tracking aligns with Delegation Toolkit caveat flows: https://docs.metamask.io/delegation-toolkit/concepts/smart-accounts/
contract SpendLimitEnforcer is ICaveatEnforcer {
    event SpendUpdated(bytes32 indexed delegationHash, uint256 newSpent);

    mapping(bytes32 => uint256) public spent;

    struct SpendConfig {
        address token;
        uint256 limit;
        uint256 increment;
    }

    function validateCaveat(bytes32 delegationHash, bytes calldata caveatData, bytes calldata) external override {
        SpendConfig memory cfg = abi.decode(caveatData, (SpendConfig));
        uint256 newSpent = spent[delegationHash] + cfg.increment;
        if (newSpent > cfg.limit) {
            revert("SPEND_LIMIT_EXCEEDED");
        }
        spent[delegationHash] = newSpent;
        emit SpendUpdated(delegationHash, newSpent);
    }
}
