// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/// @title IPool
/// @notice There is an interface for Pool Smart Contract that provides the sale of tokens
/// that will be unlocking until a certain date
/// @dev There are provided all events and function prototypes for Pool SC
interface IPool {
    /// @notice Types' enumeration of vesting
    /// @dev Types' enumeration of vesting
    enum VestingType {
        SWAP,
        LINEAR_VESTING,
        INTERVAL_VESTING
    }

    /// @notice Structured data type for variables that store information about intervals of interval vesting
    /// @dev Structured data type for variables that store information about intervals of interval vesting
    struct Interval {
        uint256 timestamp;
        uint256 percentage;
    }

    /// @notice Structured data type for variables that store information about vesting
    /// @dev Structured data type for variables that store information about vesting
    struct VestingInfo {
        uint256 periodDuration;
        uint256 countPeriodOfVesting;
        uint256 cliffDuration;
        Interval[] unlockIntervals;
    }

    /// @notice Emit when recipient gets unlocked reward tokens
    /// @dev Emit when specified recipient (harvestFor(address of recipient)) or
    /// sender (msg.sender from harvest()) gets unlocked reward tokens
    /// @param sender The address of recipient who got his rewards
    /// @param amount The amount of transfered rewards
    event Harvest(address indexed sender, uint256 amount);

    /// @notice Emit when recipient deposits his fund on sale
    /// @dev Emit when sender deposit his fund successfully
    /// @param sender The address of recipient who deposited
    /// @param amount The amount of transfered fund
    event Deposit(address indexed sender, uint256 amount);
    
    /// @notice Emit when owner increases deposit amount of some recipients
    /// @dev Emit when owner adds deposit amounts to some recipients' deposit amounts
    /// @param senders Address array of recipients
    /// @param amounts Amount array of deposits for each recipient
    event Deposits(address[] indexed senders, uint256[] amounts);
    
    /// @notice Emit when owner initializes specific allocations for some recipients
    /// @dev Emit when owner sets specific allocation that will be a higher priority than general allocation
    /// @param users Address array of recipients
    /// @param allocation Amount array of allocations for each recipient
    event SetSpecificAllocation(address[] users, uint256[] allocation);
    
    /// @notice Emit when owner increases total amount of reward token
    /// @dev Emit when owner increases total supply of reward token by the amount
    /// @param amount Amount of reward tokens that will be added to total supply
    event IncreaseTotalSupply(uint256 amount);

    /// @notice Emit when owner initializes dates of sale
    /// @dev Emit when owner sets timestamp values of date when sale will be started and ended
    /// @param startDate Start date of sale
    /// @param endDate End date of sale
    event SetTimePoint(uint256 startDate, uint256 endDate);

    /// @notice Initialize token
    /// @dev Initialize price and transfered amount of reward tokens
    /// @param tokenPrice_ The price of reward token
    /// @param totalSupply_ The total amount of reward tokens that will be on sale
    function initializeToken(uint256 tokenPrice_, uint256 totalSupply_)
        external;

    /// @notice Increase total amount of reward token
    /// @dev Increase total supply of reward token by the amount
    /// @param amount_ Amount of reward tokens that will be added to total supply
    function increaseTotalSupply(uint256 amount_) external;

    /// @notice Initialize dates of sale
    /// @dev Set timestamp values of date when sale will be started and ended
    /// @param startDate_ Start date of sale
    /// @param endDate_ End date of sale
    function setTimePoint(uint256 startDate_, uint256 endDate_) external;

    /// @notice Initialize specific allocations for some recipients
    /// @dev Set specific allocation that will be a higher priority than general allocation
    /// @param addrs_ Address array of recipients
    /// @param amount_ Amount array of allocations for each recipient
    function setSpecificAllocation(
        address[] calldata addrs_,
        uint256[] calldata amount_
    ) external;

    /// @notice Initialize specific vesting for the recipient
    /// @dev Set specific vesting that will be a higher priority than general vesting
    /// @param addr_ Address of recipient that will have specific vesting
    /// @param periodDuration_ Each period's duration for linear vesting
    /// @param countPeriodOfVesting_ Number of periods for linear vesting
    /// @param cliffPeriod_ Period duration after sale during which no rewards are given for linear vesting
    /// @param intervals_ An array of structures that stores both the date and amount of unlocking for interval vesting
    function setSpecificVesting(
        address addr_,
        uint256 periodDuration_,
        uint256 countPeriodOfVesting_,
        uint256 cliffPeriod_,
        Interval[] calldata intervals_
    ) external;

    /// @notice Initialize general vesting
    /// @dev Set vesting parameters for each recipient
    /// @param periodDuration_ Each period's duration for linear vesting
    /// @param countPeriodOfVesting_ Number of periods for linear vesting
    /// @param cliffPeriod_ Period duration after sale during which no rewards are given for linear vesting
    /// @param intervals_ An array of structures that stores both the date and amount of unlocking for interval vesting
    function setVesting(
        uint256 periodDuration_,
        uint256 countPeriodOfVesting_,
        uint256 cliffPeriod_,
        Interval[] calldata intervals_
    ) external;

    /// @notice Increase deposit amount of some recipients
    /// @dev Add deposit amounts to some recipients' deposit amounts
    /// @param addrArr_ Address array of recipients
    /// @param amountArr_ Amount array of deposits for each recipient
    function addDepositAmount(
        address[] calldata addrArr_,
        uint256[] calldata amountArr_
    ) external;

    /// @notice Complete the vesting and transfer all funds and unsold rewards to vesting owner
    /// @dev Complete the vesting and transfer all funds and unsold rewards to vesting owner
    function completeVesting() external;

    /// @notice Deposit some amount of deposit token
    /// @dev Transfer amount of deposit token signing the transaction
    /// @param amount_ The amount of deposit to be made
    function deposit(
        uint256 amount_
    ) external;

    /// @notice Harvest rewards for the recipient
    /// @dev Harvest rewards to specified recipient address
    /// @param addr_ The address of recipient
    function harvestFor(address addr_) external;

    /// @notice Harvest rewards for sender
    /// @dev Harvest rewards to sender address
    function harvest() external;

    /// @notice Harvest rewards for the sender with interval index
    /// @dev Harvest rewards to the sender address with interval index
    /// @param intervalIndex The index of interval that is already unlocked
    function harvestInterval(uint256 intervalIndex) external;

    /// @notice Get an available deposit range
    /// @dev Get available amounts to deposit for addresses with general and specific allocations
    /// @param addr_ The address of recipient
    /// @return minAvailAllocation Allowed minimum allocation to deposit
    /// @return maxAvailAllocation Allowed maximum allocation to deposit
    function getAvailAmountToDeposit(address addr_)
        external
        view
        returns (uint256 minAvailAllocation, uint256 maxAvailAllocation);

    /// @notice Get general data
    /// @dev Get general variables of contract that were setted during initialization
    /// @return name The name of vesting
    /// @return stakedToken The address of deposit token
    /// @return rewardToken The address of reward token
    /// @return minAllocation General allowed minimum allocation to deposit
    /// @return maxAllocation General allowed maximum allocation to deposit
    /// @return totalSupply The total amount of reward tokens
    /// @return totalDeposited Total deposit amount
    /// @return tokenPrice The price of one reward token
    /// @return initialUnlockPercentage Percentage in ETH that will be already unlocked after sale
    /// @return vestingType Type of vesting that can be swap, linear or interval vesting
    function getInfo()
        external
        view
        returns (
            string memory name,
            address stakedToken,
            address rewardToken,
            uint256 minAllocation,
            uint256 maxAllocation,
            uint256 totalSupply,
            uint256 totalDeposited,
            uint256 tokenPrice,
            uint256 initialUnlockPercentage,
            VestingType vestingType
        );

    /// @notice Get vesting data
    /// @dev Get variables of contract that stored info about unlocking reward dates
    /// @return periodDuration Each period's duration for linear vesting
    /// @return countPeriodOfVesting Number of periods for linear vesting
    /// @return intervals An array of structures that stores both the date and amount of unlocking for interval vesting
    function getVestingInfo()
        external
        view
        returns (
            uint256 periodDuration,
            uint256 countPeriodOfVesting,
            Interval[] memory intervals
        );

    /// @notice Get balance information to the recipient
    /// @dev Get recipient's data about locked/unlocked amounts of rewards token at the moment
    /// @param addr_ The address of recipient
    /// @return lockedBalance Amount of reward tokens that have not unlocked yet
    /// @return unlockedBalance Amount of reward tokens that recipient can withdraw right now
    function getBalanceInfo(address addr_)
        external
        view
        returns (uint256 lockedBalance, uint256 unlockedBalance);

    /// @notice Convert some amount of deposit tokens to reward tokens amount
    /// @dev Convert some amount of deposit tokens to reward tokens amount
    /// @param amount_ The amount of deposit tokens
    /// @return Amount of reward tokens
    function convertToToken(uint256 amount_) external view returns (uint256);

    /// @notice Convert some amount of reward tokens to deposit tokens amount
    /// @dev Convert some amount of reward tokens to deposit tokens amount
    /// @param amount_ The amount of reward tokens
    /// @return Amount of deposit tokens
    function convertToCurrency(uint256 amount_) external view returns (uint256);

    /// @notice Get dates of sale
    /// @dev Get timestamp values of date when sale will be started and ended
    /// @return startDate Start date of sale
    /// @return endDate End date of sale
    function getTimePoint()
        external
        view
        returns (uint256 startDate, uint256 endDate);

    /// @notice Get amounts of deposits that were paid from recipients
    /// @dev Get amounts of deposits that were paid from recipients
    /// @return Deposit amount that was paid from recipient
    function deposited(address) external view returns (uint256);

    /// @notice Get amounts of reward tokens that were paid to recipients
    /// @dev Get amounts of reward tokens that were paid to recipients
    /// @return Reward amount that was paid to recipient
    function rewardsPaid(address) external view returns (uint256);

    /// @notice Get amounts of specific deposit allocations that were allowed for some recipients
    /// @dev Get amounts of specific deposit allocations that were allowed for some recipients
    /// @return Amount of specific allocation for recipient
    function specificAllocation(address) external view returns (uint256);
}
