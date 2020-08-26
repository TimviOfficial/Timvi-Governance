// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "../TimviGovernanceToken.sol";


contract RandomTokenMock is TimviGovernanceToken {

    function mint(address to, uint amount) external {
        _mint(to, amount);
    }
}
