// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ICaveatEnforcer {
    /// @notice Validates caveats per Delegation Toolkit guidance: https://docs.metamask.io/delegation-toolkit/concepts/smart-accounts/
    function validateCaveat(bytes32 delegationHash, bytes calldata caveatData, bytes calldata context) external;
}
