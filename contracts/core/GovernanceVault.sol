// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./IGovVault.sol";

contract GovernanceVault is IGovVault, ERC20, ERC20Votes, ReentrancyGuard {
    using SafeERC20 for IERC20;

    address public immutable override underlyingToken;

    constructor(
        address _token,
        string memory _name,
        string memory _symbol
    ) ERC20(_name, _symbol) EIP712(_name, "1") {
        require(_token != address(0), "Invalid token");
        underlyingToken = _token;
    }

    function deposit(uint256 amount) external override nonReentrant {
        require(amount > 0, "Amount must be > 0");
        
        IERC20(underlyingToken).safeTransferFrom(msg.sender, address(this), amount);
        _mint(msg.sender, amount);
        
        emit Deposited(msg.sender, amount);
    }

    function withdraw(uint256 amount) external override nonReentrant {
        require(amount > 0, "Amount must be > 0");
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");

        _burn(msg.sender, amount);
        IERC20(underlyingToken).safeTransfer(msg.sender, amount);

        emit Withdrawn(msg.sender, amount);
    }

    function delegate(address delegatee) public override(IGovVault, Votes) {
        super.delegate(delegatee);
        emit Delegated(msg.sender, delegatee, balanceOf(msg.sender));
    }

    function getVotes(address account) public view override(IGovVault, Votes) returns (uint256) {
        return super.getVotes(account);
    }

    function getPastVotes(address account, uint256 timepoint) public view override(IGovVault, Votes) returns (uint256) {
        return super.getPastVotes(account, timepoint);
    }

    function totalAssets() external view override returns (uint256) {
        return IERC20(underlyingToken).balanceOf(address(this));
    }

    // Overrides required by Solidity
    function _update(address from, address to, uint256 value) internal override(ERC20, ERC20Votes) {
        super._update(from, to, value);
    }

    function nonces(address owner) public view override(ERC20Permit, Nonces) returns (uint256) {
        return super.nonces(owner);
    }
}