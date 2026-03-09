// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

/// @title SZTUSwap - ETH/SZTU AMM (Uniswap V2 style constant product)
contract SZTUSwap is ERC20, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable sztuToken;

    uint256 public ethReserve;
    uint256 public sztuReserve;

    uint256 private constant FEE_NUMERATOR = 997;
    uint256 private constant FEE_DENOMINATOR = 1000;
    uint256 private constant MINIMUM_LIQUIDITY = 1000;

    event LiquidityAdded(
        address indexed provider,
        uint256 ethAmount,
        uint256 sztuAmount,
        uint256 lpMinted
    );

    event LiquidityRemoved(
        address indexed provider,
        uint256 ethAmount,
        uint256 sztuAmount,
        uint256 lpBurned
    );

    event Swap(
        address indexed user,
        bool ethToSztu,
        uint256 amountIn,
        uint256 amountOut
    );

    constructor(address _sztuToken) ERC20("SZTU-ETH LP", "SZTU-LP") {
        require(_sztuToken != address(0), "Invalid token");
        sztuToken = IERC20(_sztuToken);
    }

    /// @notice Add liquidity to the ETH/SZTU pool
    /// @param sztuAmount Amount of SZTU to deposit
    /// @return lpAmount LP tokens minted
    function addLiquidity(uint256 sztuAmount) external payable nonReentrant returns (uint256 lpAmount) {
        require(msg.value > 0, "ETH required");
        require(sztuAmount > 0, "SZTU required");

        uint256 _totalSupply = totalSupply();

        if (_totalSupply == 0) {
            lpAmount = Math.sqrt(msg.value * sztuAmount) - MINIMUM_LIQUIDITY;
            _mint(address(1), MINIMUM_LIQUIDITY); // lock minimum liquidity
        } else {
            uint256 lpByEth = (msg.value * _totalSupply) / ethReserve;
            uint256 lpBySztu = (sztuAmount * _totalSupply) / sztuReserve;
            lpAmount = lpByEth < lpBySztu ? lpByEth : lpBySztu;
        }

        require(lpAmount > 0, "Insufficient liquidity minted");

        sztuToken.safeTransferFrom(msg.sender, address(this), sztuAmount);

        ethReserve += msg.value;
        sztuReserve += sztuAmount;

        _mint(msg.sender, lpAmount);

        emit LiquidityAdded(msg.sender, msg.value, sztuAmount, lpAmount);
    }

    /// @notice Remove liquidity and receive ETH + SZTU
    /// @param lpAmount Amount of LP tokens to burn
    /// @return ethAmount ETH returned
    /// @return sztuAmount SZTU returned
    function removeLiquidity(uint256 lpAmount) external nonReentrant returns (uint256 ethAmount, uint256 sztuAmount) {
        require(lpAmount > 0, "LP amount required");
        require(balanceOf(msg.sender) >= lpAmount, "Insufficient LP");

        uint256 _totalSupply = totalSupply();
        ethAmount = (lpAmount * ethReserve) / _totalSupply;
        sztuAmount = (lpAmount * sztuReserve) / _totalSupply;

        require(ethAmount > 0 && sztuAmount > 0, "Insufficient liquidity burned");

        _burn(msg.sender, lpAmount);

        ethReserve -= ethAmount;
        sztuReserve -= sztuAmount;

        sztuToken.safeTransfer(msg.sender, sztuAmount);

        (bool sent, ) = payable(msg.sender).call{value: ethAmount}("");
        require(sent, "ETH transfer failed");

        emit LiquidityRemoved(msg.sender, ethAmount, sztuAmount, lpAmount);
    }

    /// @notice Swap ETH for SZTU
    /// @param minSztuOut Minimum SZTU to receive (slippage protection)
    /// @return sztuOut Actual SZTU received
    function swapETHForSZTU(uint256 minSztuOut) external payable nonReentrant returns (uint256 sztuOut) {
        require(msg.value > 0, "ETH required");
        require(ethReserve > 0 && sztuReserve > 0, "No liquidity");

        sztuOut = getAmountOut(msg.value, ethReserve, sztuReserve);
        require(sztuOut >= minSztuOut, "Slippage exceeded");
        require(sztuOut < sztuReserve, "Insufficient reserve");

        ethReserve += msg.value;
        sztuReserve -= sztuOut;

        sztuToken.safeTransfer(msg.sender, sztuOut);

        emit Swap(msg.sender, true, msg.value, sztuOut);
    }

    /// @notice Swap SZTU for ETH
    /// @param sztuIn Amount of SZTU to sell
    /// @param minEthOut Minimum ETH to receive (slippage protection)
    /// @return ethOut Actual ETH received
    function swapSZTUForETH(uint256 sztuIn, uint256 minEthOut) external nonReentrant returns (uint256 ethOut) {
        require(sztuIn > 0, "SZTU required");
        require(ethReserve > 0 && sztuReserve > 0, "No liquidity");

        ethOut = getAmountOut(sztuIn, sztuReserve, ethReserve);
        require(ethOut >= minEthOut, "Slippage exceeded");
        require(ethOut < ethReserve, "Insufficient reserve");

        sztuToken.safeTransferFrom(msg.sender, address(this), sztuIn);

        sztuReserve += sztuIn;
        ethReserve -= ethOut;

        (bool sent, ) = payable(msg.sender).call{value: ethOut}("");
        require(sent, "ETH transfer failed");

        emit Swap(msg.sender, false, sztuIn, ethOut);
    }

    /// @notice Calculate output amount with 0.3% fee
    function getAmountOut(
        uint256 amountIn,
        uint256 reserveIn,
        uint256 reserveOut
    ) public pure returns (uint256) {
        require(amountIn > 0, "Insufficient input");
        require(reserveIn > 0 && reserveOut > 0, "Insufficient reserves");

        uint256 amountInWithFee = amountIn * FEE_NUMERATOR;
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = (reserveIn * FEE_DENOMINATOR) + amountInWithFee;
        return numerator / denominator;
    }

    /// @notice Get current reserves
    function getReserves() external view returns (uint256 _ethReserve, uint256 _sztuReserve) {
        return (ethReserve, sztuReserve);
    }

    /// @notice Get current price: how much SZTU per 1 ETH (scaled by 1e18)
    function getPrice() external view returns (uint256) {
        if (ethReserve == 0) return 0;
        return (sztuReserve * 1e18) / ethReserve;
    }

    receive() external payable {
        revert("Use swapETHForSZTU or addLiquidity");
    }
}
