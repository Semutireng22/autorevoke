// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Types} from "../lib/Types.sol";

interface IDelegationRegistry {
    function createDelegation(Types.Delegation calldata delegation, Types.Caveat[] calldata caveats) external;

    function revoke(bytes32 delegationHash) external;

    function redeem(bytes32 delegationHash, bytes calldata context) external;

    function active(bytes32 delegationHash) external view returns (bool);
}
