// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IGovVault {
    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event Delegated(address indexed delegator, address indexed delegatee, uint256 weight);

    function deposit(uint256 amount) external;
    function withdraw(uint256 amount) external;
    function delegate(address delegatee) external;
    
    function getVotes(address account) external view returns (uint256);
    function getPastVotes(address account, uint256 blockNumber) external view returns (uint256);
    function underlyingToken() external view returns (address);
    function totalAssets() external view returns (uint256);
}