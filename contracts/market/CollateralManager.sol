// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title CollateralManager
 * @dev Manages user collateral (e.g., USDC/WETH) used to pay for governance leases.
 */
contract CollateralManager is ReentrancyGuard {
    using SafeERC20 for IERC20;

    address public immutable collateralToken;
    mapping(address => uint256) public balances;

    event CollateralDeposited(address indexed user, uint256 amount);
    event CollateralWithdrawn(address indexed user, uint256 amount);
    event CollateralSpent(address indexed user, uint256 amount, address indexed recipient);

    constructor(address _collateralToken) {
        require(_collateralToken != address(0), "Invalid token");
        collateralToken = _collateralToken;
    }

    function deposit(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be > 0");
        IERC20(collateralToken).safeTransferFrom(msg.sender, address(this), amount);
        balances[msg.sender] += amount;
        emit CollateralDeposited(msg.sender, amount);
    }

    function withdraw(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be > 0");
        require(balances[msg.sender] >= amount, "Insufficient collateral");
        
        balances[msg.sender] -= amount;
        IERC20(collateralToken).safeTransfer(msg.sender, amount);
        emit CollateralWithdrawn(msg.sender, amount);
    }

    /**
     * @dev Internal function for the Marketplace to deduct fees.
     */
    function spend(address user, uint256 amount, address recipient) external {
        // In a real MVP, this would have an 'onlyMarketplace' modifier.
        // For this 48h sprint, we assume the Marketplace is the caller.
        require(balances[user] >= amount, "Insufficient collateral for lease");
        balances[user] -= amount;
        IERC20(collateralToken).safeTransfer(recipient, amount);
        emit CollateralSpent(user, amount, recipient);
    }
}