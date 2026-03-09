// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract MedicalService is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public sztuToken;
    uint256 public serviceFee = 10 * 10 ** 18; // 10 SZTU
    uint256 public airdropAmount = 100 * 10 ** 18; // 注册空投 100 SZTU

    uint256 public totalReports;

    struct Report {
        address user;
        string reportHash;
        uint256 timestamp;
        uint256 feePaid;
    }

    mapping(uint256 => Report) public reports;
    mapping(address => uint256[]) public userReports;
    mapping(address => bool) public registeredUsers;

    event ReportRequested(
        uint256 indexed reportId,
        address indexed user,
        string reportHash,
        uint256 feePaid,
        uint256 timestamp
    );

    event UserRegistered(address indexed user, uint256 airdropAmount);
    event ServiceFeeUpdated(uint256 oldFee, uint256 newFee);
    event AirdropAmountUpdated(uint256 oldAmount, uint256 newAmount);
    event TokensWithdrawn(address indexed to, uint256 amount);

    constructor(address _tokenAddress) Ownable(msg.sender) {
        require(_tokenAddress != address(0), "Invalid token address");
        sztuToken = IERC20(_tokenAddress);
    }

    /// @notice Owner 调用，为新注册用户空投 100 SZTU（从合约余额中扣）
    function registerUser(address _user) external onlyOwner {
        require(_user != address(0), "Invalid address");
        require(!registeredUsers[_user], "User already registered");

        uint256 balance = sztuToken.balanceOf(address(this));
        require(balance >= airdropAmount, "Insufficient airdrop balance");

        registeredUsers[_user] = true;
        sztuToken.safeTransfer(_user, airdropAmount);

        emit UserRegistered(_user, airdropAmount);
    }

    /// @notice 用户调用此函数请求生成报告，需先 approve 足够的 SZTU
    function generateReport(string calldata reportHash) external nonReentrant returns (uint256) {
        require(bytes(reportHash).length > 0, "Report hash required");

        sztuToken.safeTransferFrom(msg.sender, address(this), serviceFee);

        uint256 reportId = totalReports++;
        reports[reportId] = Report({
            user: msg.sender,
            reportHash: reportHash,
            timestamp: block.timestamp,
            feePaid: serviceFee
        });
        userReports[msg.sender].push(reportId);

        emit ReportRequested(reportId, msg.sender, reportHash, serviceFee, block.timestamp);

        return reportId;
    }

    function updateServiceFee(uint256 _newFee) external onlyOwner {
        require(_newFee > 0, "Fee must be > 0");
        uint256 oldFee = serviceFee;
        serviceFee = _newFee;
        emit ServiceFeeUpdated(oldFee, _newFee);
    }

    function updateAirdropAmount(uint256 _newAmount) external onlyOwner {
        require(_newAmount > 0, "Amount must be > 0");
        uint256 oldAmount = airdropAmount;
        airdropAmount = _newAmount;
        emit AirdropAmountUpdated(oldAmount, _newAmount);
    }

    /// @notice 只有 owner 能提走合约中的代币
    function withdrawTokens(address _to, uint256 _amount) external onlyOwner {
        require(_to != address(0), "Invalid address");
        uint256 balance = sztuToken.balanceOf(address(this));
        require(_amount <= balance, "Insufficient balance");
        sztuToken.safeTransfer(_to, _amount);
        emit TokensWithdrawn(_to, _amount);
    }

    function getUserReports(address _user) external view returns (uint256[] memory) {
        return userReports[_user];
    }

    function getContractBalance() external view returns (uint256) {
        return sztuToken.balanceOf(address(this));
    }

    function isRegistered(address _user) external view returns (bool) {
        return registeredUsers[_user];
    }
}
