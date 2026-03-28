// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title PremiumCalculator
 * @dev Calculates the 'Governance Premium' based on vault utilization.
 * Formula: Rate = BaseRate + (Utilization * Slope1) + (ExcessUtilization * Slope2)
 */
contract PremiumCalculator {
    uint256 public constant OPTIMAL_UTILIZATION = 0.8e18; // 80%
    
    uint256 public immutable baseRate; // 1e18 = 1%
    uint256 public immutable slope1;
    uint256 public immutable slope2;

    constructor(uint256 _baseRate, uint256 _slope1, uint256 _slope2) {
        require(_slope1 > 0 && _slope2 > 0, "Slopes must be positive");
        baseRate = _baseRate;
        slope1 = _slope1;
        slope2 = _slope2;
    }

    /**
     * @notice Calculates the annual interest rate for borrowing voting power.
     * @param totalAssets Total tokens in the vault.
     * @param borrowedAssets Total tokens currently delegated/leased.
     * @return The current interest rate in 18 decimal precision.
     */
    function calculateRate(uint256 totalAssets, uint256 borrowedAssets) public view returns (uint256) {
        if (totalAssets == 0) return baseRate;
        
        // Safety check: if borrowed exceeds total (should not happen in healthy vault), cap at 100%
        uint256 effectiveBorrowed = borrowedAssets > totalAssets ? totalAssets : borrowedAssets;
        uint256 utilization = (effectiveBorrowed * 1e18) / totalAssets;

        if (utilization <= OPTIMAL_UTILIZATION) {
            return baseRate + (utilization * slope1) / 1e18;
        } else {
            // Calculate how far we are into the 'excess' zone (above 80%)
            // utilization is between 0.8e18 and 1e18
            uint256 excessUtilization = (utilization - OPTIMAL_UTILIZATION) * 1e18 / (1e18 - OPTIMAL_UTILIZATION);
            return baseRate + slope1 + (excessUtilization * slope2) / 1e18;
        }
    }

    /**
     * @notice Predicts the rate after a specific amount is borrowed.
     * @dev Prevents 'rate-sniping' by allowing the marketplace to charge based on post-borrow utilization.
     */
    function getPostBorrowRate(uint256 totalAssets, uint256 borrowedAssets, uint256 amount) external view returns (uint256) {
        return calculateRate(totalAssets, borrowedAssets + amount);
    }
}