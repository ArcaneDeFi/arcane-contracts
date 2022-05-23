// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./interfaces/IPool.sol";
import "../node_modules/@openzeppelin/contracts/access/Ownable.sol";
import "../node_modules/@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../node_modules/@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../node_modules/@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "../node_modules/@openzeppelin/contracts/utils/math/Math.sol";

/// @title Pool
/// @notice This Smart Contract provides the sale of tokens that will be unlocking until a certain date
/// @dev This Smart Contract provides the sale of tokens that will be unlocking until a certain date
contract Pool is IPool, Ownable {
    using SafeERC20 for IERC20;
    using Math for uint256;

    /// @notice Store amounts of deposits that were paid from recipients
    /// @dev Store amounts of deposits that were paid from recipients
    /// @return Deposit amount that was paid from recipient
    mapping(address => uint256) public override deposited;
    
    /// @notice Store amounts of specific deposit allocations that were allowed for some recipients
    /// @dev Store amounts of specific deposit allocations that were allowed for some recipients
    /// @return Amount of specific allocation for recipient
    mapping(address => uint256) public override rewardsPaid;

    /// @notice Store amounts of specific deposit allocations that were allowed for some recipients
    /// @dev Store amounts of specific deposit allocations that were allowed for some recipients
    /// @return Amount of specific allocation for recipient
    mapping(address => uint256) public override specificAllocation;
    
    /// @notice Store specific vesting data for some recipients
    /// @dev Store specific vesting data for some recipients
    /// return The value of the structure variable VestingInfo (period duration,
    /// count period of vesting, cliff duration, unlock intervals) for recipient
    mapping(address => VestingInfo) public specificVesting;

    /// @notice Store decimals of reward token
    /// @dev Store number of reward token decimals
    /// @return Number of reward token decimals
    uint8 public rewardTokenDecimals;
    
    /// @notice Store decimals of staked token
    /// @dev Store number of staked token decimals
    /// @return Number of staked token decimals
    uint8 public stakedTokenDecimals;
    
    /// @notice Store bool whether the vesting is completed
    /// @dev Store bool whether the vesting is completed
    /// @return Bool whether the vesting is completed
    bool public isCompleted;

    /// @notice Store reward token
    /// @dev Store instance of reward ERC20 token
    IERC20 internal _rewardToken;

    /// @notice Store deposit token
    /// @dev Store instance of deposit ERC20 token
    IERC20 internal _depositToken;

    /// @notice Store initial unlock percentage
    /// @dev Store percentage that will be already unlocked after sale
    uint256 internal _initialPercentage;

    /// @notice Store general allowed minimum allocation to deposit
    /// @dev Store general allowed minimum allocation to deposit
    uint256 internal _minAllocation;

    /// @notice Store general allowed maximum allocation to deposit
    /// @dev Store general allowed maximum allocation to deposit
    uint256 internal _maxAllocation;

    /// @notice Store type of vesting
    /// @dev Store type of vesting that can be swap, linear or interval vesting
    VestingType internal _vestingType;

    /// @notice Store data of vesting
    /// @dev Store period duration, count period of vesting, cliff duration, unlock intervals)
    VestingInfo internal _vestingInfo;

    /// @notice Store the name of vesting
    /// @dev Store the name of vesting
    string internal _name;

    /// @notice Store the total reward supply
    /// @dev Store the total amount of reward tokens
    uint256 internal _totalSupply;

    /// @notice Store the token price
    /// @dev Store the price of one reward token
    uint256 internal _tokenPrice;

    /// @notice Store total deposit amount
    /// @dev Store total amount of deposits that were paid from recipients
    uint256 internal _totalDeposited;

    /// @notice Store start date of sale
    /// @dev Store timestamp value of date when sale will be started
    uint256 internal _startDate;

    /// @notice Store end date of sale
    /// @dev Store timestamp value of date when sale will be ended
    uint256 internal _endDate;

    /// @notice Store constant of percentage 100
    /// @dev Store value of 100 ethers
    uint256 internal constant _MAX_INITIAL_PERCENTAGE = 1e20;
    
    /// @notice Initialization
    /// @dev Initialize contract, grand roles for the deployer
    /// @param name_ The name of vesting
    /// @param rewardToken_ The address of reward token
    /// @param depositToken_ The address of deposit token
    /// @param initialUnlockPercentage_ Percentage in ETH that will be already unlocked after sale
    /// @param minAllocation_ General allowed minimum allocation to deposit
    /// @param maxAllocation_ General allowed maximum allocation to deposit
    /// @param vestingType_ Type of vesting that can be swap, linear or interval vesting
    constructor(
        string memory name_,
        address rewardToken_,
        address depositToken_,
        uint256 initialUnlockPercentage_,
        uint256 minAllocation_,
        uint256 maxAllocation_,
        VestingType vestingType_
    ) {
        require(
            rewardToken_ != address(0) && depositToken_ != address(0),
            "Incorrect token address"
        );
        require(
            minAllocation_ <= maxAllocation_ && maxAllocation_ != 0,
            "Incorrect allocation"
        );
        require(
            initialUnlockPercentage_ <= _MAX_INITIAL_PERCENTAGE,
            "Incorrect initial percentage"
        );

        _initialPercentage = initialUnlockPercentage_;
        _minAllocation = minAllocation_;
        _maxAllocation = maxAllocation_;
        _name = name_;
        _vestingType = vestingType_;
        _rewardToken = IERC20(rewardToken_);
        _depositToken = IERC20(depositToken_);
        rewardTokenDecimals = IERC20Metadata(rewardToken_).decimals();
        stakedTokenDecimals = IERC20Metadata(depositToken_).decimals();
    }

    /// @notice Initialize token
    /// @dev Initialize price and transfered amount of reward tokens
    /// @param tokenPrice_ The price of reward token
    /// @param totalSupply_ The total amount of reward tokens that will be on sale
    function initializeToken(uint256 tokenPrice_, uint256 totalSupply_)
        external
        virtual
        override
        onlyOwner
    {
        require(_tokenPrice == 0, "It was initialized before");
        require(totalSupply_ > 0 && tokenPrice_ > 0, "Incorrect amount");

        _tokenPrice = tokenPrice_;
        _totalSupply = totalSupply_;

        _rewardToken.safeTransferFrom(
            _msgSender(),
            address(this),
            totalSupply_
        );
    }

    /// @notice Increase total amount of reward token
    /// @dev Increase total supply of reward token by the amount
    /// @param amount_ Amount of reward tokens that will be added to total supply
    function increaseTotalSupply(uint256 amount_)
        external
        virtual
        override
        onlyOwner
    {
        _totalSupply += amount_;
        _rewardToken.safeTransferFrom(_msgSender(), address(this), amount_);
        emit IncreaseTotalSupply(amount_);
    }

    /// @notice Initialize dates of sale
    /// @dev Set timestamp values of date when sale will be started and ended
    /// @param startDate_ Start date of sale
    /// @param endDate_ End date of sale
    function setTimePoint(uint256 startDate_, uint256 endDate_)
        external
        virtual
        override
        onlyOwner
    {
        require(
            startDate_ < endDate_ && block.timestamp < startDate_,
            "Incorrect dates"
        );
        _startDate = startDate_;
        _endDate = endDate_;
        emit SetTimePoint(startDate_, endDate_);
    }

    /// @notice Initialize specific allocations for some recipients
    /// @dev Set specific allocation that will be a higher priority than general allocation
    /// @param addrs_ Address array of recipients
    /// @param amount_ Amount array of allocations for each recipient
    function setSpecificAllocation(
        address[] calldata addrs_,
        uint256[] calldata amount_
    ) external virtual override onlyOwner {
        require(addrs_.length == amount_.length, "Different array size");

        for (uint256 index = 0; index < addrs_.length; index++) {
            specificAllocation[addrs_[index]] = amount_[index];
        }
        emit SetSpecificAllocation(addrs_, amount_);
    }

    /// @notice Initialize general vesting
    /// @dev Set vesting parameters for each recipient
    /// @param periodDuration_ Each period's duration for linear vesting
    /// @param countPeriodOfVesting_ Number of periods for linear vesting
    /// @param cliffDuration_ Period duration after sale during which no rewards are given for linear vesting
    /// @param intervals_ An array of structures that stores both the date and amount of unlocking for interval vesting
    function setVesting(
        uint256 periodDuration_,
        uint256 countPeriodOfVesting_,
        uint256 cliffDuration_,
        Interval[] calldata intervals_
    ) external virtual override onlyOwner {
        VestingInfo storage info = _vestingInfo;
        _setVesting(
            info,
            periodDuration_,
            countPeriodOfVesting_,
            cliffDuration_,
            intervals_
        );
    }

    /// @notice Initialize specific vesting for the recipient
    /// @dev Set specific vesting that will be a higher priority than general vesting
    /// @param addr_ Address of recipient that will have specific vesting
    /// @param periodDuration_ Each period's duration for linear vesting
    /// @param countPeriodOfVesting_ Number of periods for linear vesting
    /// @param cliffDuration_ Period duration after sale during which no rewards are given for linear vesting
    /// @param intervals_ An array of structures that stores both the date and amount of unlocking for interval vesting
    function setSpecificVesting(
        address addr_,
        uint256 periodDuration_,
        uint256 countPeriodOfVesting_,
        uint256 cliffDuration_,
        Interval[] calldata intervals_
    ) external virtual override onlyOwner {
        VestingInfo storage info = specificVesting[addr_];
        require(
            !(info.countPeriodOfVesting > 0 || info.unlockIntervals.length > 0),
            "It was initialized before"
        );
        _setVesting(
            info,
            periodDuration_,
            countPeriodOfVesting_,
            cliffDuration_,
            intervals_
        );
    }

    /// @notice Increase deposit amount of some recipients
    /// @dev Add deposit amounts to some recipients' deposit amounts
    /// @param addrArr_ Address array of recipients
    /// @param amountArr_ Amount array of deposits for each recipient
    function addDepositAmount(
        address[] calldata addrArr_,
        uint256[] calldata amountArr_
    ) external virtual override onlyOwner {
        require(addrArr_.length == amountArr_.length, "Incorrect array length");
        require(!_isVestingStarted(), "Sale is closed");

        uint256 remainingAllocation = _totalSupply -
            convertToToken(_totalDeposited);

        for (uint256 index = 0; index < addrArr_.length; index++) {
            uint256 convertAmount = convertToToken(amountArr_[index]);
            require(
                convertAmount <= remainingAllocation,
                "Not enough allocation"
            );

            remainingAllocation -= convertAmount;
            deposited[addrArr_[index]] += amountArr_[index];
            _totalDeposited += amountArr_[index];
        }
        emit Deposits(addrArr_, amountArr_);
    }

    /// @notice Complete the vesting and transfer all funds and unsold rewards to vesting owner
    /// @dev Complete the vesting and transfer all funds and unsold rewards to vesting owner
    function completeVesting() external virtual override onlyOwner {
        require(_isVestingStarted(), "Vesting cannot be started");
        require(!isCompleted, "Completing was called before");
        isCompleted = true;

        uint256 soldToken = convertToToken(_totalDeposited);

        if (soldToken < _totalSupply)
            _rewardToken.safeTransfer(_msgSender(), _totalSupply - soldToken);

        uint256 balance = _depositToken.balanceOf(address(this));
        _depositToken.safeTransfer(_msgSender(), balance);
    }

    /// @notice Deposit some amount of deposit token
    /// @dev Transfer amount of deposit token signing the transaction
    /// @param amount_ The amount of deposit to be made
    function deposit(uint256 amount_) external virtual override {
        require(_isSale(), "Sale is closed");
        require(_isValidAmount(amount_), "Invalid amount");

        deposited[_msgSender()] += amount_;
        _totalDeposited += amount_;

        uint256 transferAmount = _convertToCorrectDecimals(
            amount_,
            rewardTokenDecimals,
            stakedTokenDecimals
        );
        _depositToken.safeTransferFrom(
            _msgSender(),
            address(this),
            transferAmount
        );

        if (VestingType.SWAP == _vestingType) {
            uint256 tokenAmount = convertToToken(amount_);
            rewardsPaid[_msgSender()] += tokenAmount;
            _rewardToken.safeTransfer(_msgSender(), tokenAmount);
            emit Harvest(_msgSender(), tokenAmount);
        }

        emit Deposit(_msgSender(), amount_);
    }

    /// @notice Harvest rewards for the recipient
    /// @dev Harvest rewards to specified recipient address
    /// @param _addr The address of recipient
    function harvestFor(address _addr) external virtual override {
        _harvest(_addr, 0);
    }

    /// @notice Harvest rewards for sender
    /// @dev Harvest rewards to sender address
    function harvest() external virtual override {
        _harvest(_msgSender(), 0);
    }

    /// @notice Harvest rewards for the sender with interval index
    /// @dev Harvest rewards to the sender address with interval index
    /// @param intervalIndex The index of interval that is already unlocked
    function harvestInterval(uint256 intervalIndex) external virtual override {
        _harvest(_msgSender(), intervalIndex);
    }

    /// @notice Get an available deposit range
    /// @dev Get available amounts to deposit for addresses with general and specific allocations
    /// @param addr_ The address of recipient
    /// @return minAvailAllocation Allowed minimum allocation to deposit
    /// @return maxAvailAllocation Allowed maximum allocation to deposit
    function getAvailAmountToDeposit(address addr_)
        external
        view
        virtual
        override
        returns (uint256 minAvailAllocation, uint256 maxAvailAllocation)
    {
        uint256 totalCurrency = convertToCurrency(_totalSupply);

        if (totalCurrency <= _totalDeposited) {
            return (0, 0);
        }

        uint256 depositedAmount = deposited[addr_];

        uint256 remaining = totalCurrency - _totalDeposited;

        uint256 maxAllocation = specificAllocation[addr_] > 0
            ? specificAllocation[addr_]
            : _maxAllocation;
        maxAvailAllocation = depositedAmount < maxAllocation
            ? Math.min(maxAllocation - depositedAmount, remaining)
            : 0;
        minAvailAllocation = depositedAmount == 0 ? _minAllocation : 0;
    }

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
        virtual
        override
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
        )
    {
        return (
            _name,
            address(_depositToken),
            address(_rewardToken),
            _minAllocation,
            _maxAllocation,
            _totalSupply,
            _totalDeposited,
            _tokenPrice,
            _initialPercentage,
            _vestingType
        );
    }

    /// @notice Get dates of sale
    /// @dev Get timestamp values of date when sale will be started and ended
    /// @return startDate Start date of sale
    /// @return endDate End date of sale
    function getTimePoint()
        external
        view
        virtual
        override
        returns (
            uint256 startDate,
            uint256 endDate
        )
    {
        return (_startDate, _endDate);
    }

    /// @notice Get vesting data
    /// @dev Get variables of contract that stored info about unlocking reward dates
    /// @return periodDuration Each period's duration for linear vesting
    /// @return countPeriodOfVesting Number of periods for linear vesting
    /// @return intervals An array of structures that stores both the date and amount of unlocking for interval vesting
    function getVestingInfo()
        external
        view
        virtual
        override
        returns (
            uint256 periodDuration,
            uint256 countPeriodOfVesting,
            Interval[] memory intervals
        )
    {
        VestingInfo memory info = _vestingInfo;
        uint256 size = info.unlockIntervals.length;
        intervals = new Interval[](size);

        for (uint256 i = 0; i < size; i++) {
            intervals[i] = info.unlockIntervals[i];
        }
        periodDuration = info.periodDuration;
        countPeriodOfVesting = info.countPeriodOfVesting;
    }

    /// @notice Get balance information to the recipient
    /// @dev Get recipient's data about locked/unlocked amounts of rewards token at the moment
    /// @param addr_ The address of recipient
    /// @return lockedBalance Amount of reward tokens that have not unlocked yet
    /// @return unlockedBalance Amount of reward tokens that recipient can withdraw right now
    function getBalanceInfo(address addr_)
        external
        view
        virtual
        override
        returns (uint256 lockedBalance, uint256 unlockedBalance)
    {
        uint256 tokenBalance = convertToToken(deposited[addr_]);

        if (!_isVestingStarted()) {
            return (tokenBalance, 0);
        }

        uint256 unlock = _calculateUnlock(addr_, 0);
        return (tokenBalance - unlock - rewardsPaid[addr_], unlock);
    }

    /// @notice Convert some amount of deposit tokens to reward tokens amount
    /// @dev Convert some amount of deposit tokens to reward tokens amount
    /// @param amount_ The amount of deposit tokens
    /// @return Amount of reward tokens
    function convertToToken(uint256 amount_)
        public
        view
        virtual
        override
        returns (uint256)
    {
        return (amount_ * 10**rewardTokenDecimals) / _tokenPrice;
    }

    /// @notice Convert some amount of reward tokens to deposit tokens amount
    /// @dev Convert some amount of reward tokens to deposit tokens amount
    /// @param amount_ The amount of reward tokens
    /// @return Amount of deposit tokens
    function convertToCurrency(uint256 amount_)
        public
        view
        virtual
        override
        returns (uint256)
    {
        return (amount_ * _tokenPrice) / 10**rewardTokenDecimals;
    }

    /// @notice Initialize vesting data
    /// @dev Set vesting parameters for recipients
    /// @param info Default vesting values
    /// @param periodDuration_ Each period's duration for linear vesting
    /// @param countPeriodOfVesting_ Number of periods for linear vesting
    /// @param cliffDuration_ Period duration after sale during which no rewards are given for linear vesting
    /// @param _intervals An array of structures that stores both the date and amount of unlocking for interval vesting
    function _setVesting(
        VestingInfo storage info,
        uint256 periodDuration_,
        uint256 countPeriodOfVesting_,
        uint256 cliffDuration_,
        Interval[] calldata _intervals
    ) internal virtual {
        if (VestingType.LINEAR_VESTING == _vestingType) {
            require(
                countPeriodOfVesting_ > 0 && periodDuration_ > 0,
                "Incorrect linear vesting setup"
            );
            info.periodDuration = periodDuration_;
            info.countPeriodOfVesting = countPeriodOfVesting_;
            info.cliffDuration = cliffDuration_;
        } else {
            delete info.unlockIntervals;
            uint256 lastUnlockingPart = _initialPercentage;
            uint256 lastIntervalStartingTimestamp = _endDate;
            for (uint256 i = 0; i < _intervals.length; i++) {
                uint256 percent = _intervals[i].percentage;
                require(
                    percent > lastUnlockingPart &&
                        percent <= _MAX_INITIAL_PERCENTAGE,
                    "Invalid interval unlocking part"
                );
                require(
                    _intervals[i].timestamp > lastIntervalStartingTimestamp,
                    "Invalid interval starting timestamp"
                );
                lastUnlockingPart = percent;
                info.unlockIntervals.push(_intervals[i]);
            }
            require(
                lastUnlockingPart == _MAX_INITIAL_PERCENTAGE,
                "Invalid interval unlocking part"
            );
        }
    }

    /// @notice Harvest rewards for the recipient with interval index
    /// @dev Harvest rewards to the recipient address with interval index
    /// @param _addr The address of recipient
    /// @param intervalIndex The index of interval that is already unlocked
    function _harvest(address _addr, uint256 intervalIndex) internal virtual {
        require(_isVestingStarted(), "Vesting can't be started");

        uint256 amountToTransfer = _calculateUnlock(_addr, intervalIndex);

        require(amountToTransfer > 0, "Amount is zero");

        rewardsPaid[_addr] += amountToTransfer;

        _rewardToken.safeTransfer(_addr, amountToTransfer);

        emit Harvest(_addr, amountToTransfer);
    }

    /// @notice Compute unlocking amount of reward tokens to recipient
    /// @dev Compute unlocking amount of reward tokens to recipient for interval or linear vesting
    /// @param addr_ The address of recipient
    /// @param intervalIndex_ The index of interval that is already unlocked
    /// @return Unlocked amount of reward tokens
    function _calculateUnlock(address addr_, uint256 intervalIndex_)
        internal
        view
        virtual
        returns (uint256)
    {
        uint256 tokenAmount = convertToToken(deposited[addr_]);
        uint256 oldRewards = rewardsPaid[addr_];

        VestingInfo memory info = specificVesting[addr_].periodDuration > 0 ||
            specificVesting[addr_].unlockIntervals.length > 0
            ? specificVesting[addr_]
            : _vestingInfo;

        if (VestingType.LINEAR_VESTING == _vestingType) {
            tokenAmount = _calculateLinearUnlock(info, tokenAmount);
        } else if (VestingType.INTERVAL_VESTING == _vestingType) {
            tokenAmount = _calculateIntervalUnlock(
                info.unlockIntervals,
                tokenAmount,
                intervalIndex_
            );
        }
        return tokenAmount > oldRewards ? tokenAmount - oldRewards : 0;
    }
    
    /// @notice Compute unlocking amount of reward tokens to recipient for linear vesting
    /// @dev Compute unlocking amount of reward tokens to recipient for linear vesting
    /// @param info Vesting data (general or specific)
    /// @param tokenAmount Available reward token amount
    /// @return Unlocked amount of reward tokens
    function _calculateLinearUnlock(
        VestingInfo memory info,
        uint256 tokenAmount
    ) internal view virtual returns (uint256) {
        if (block.timestamp > _endDate + info.cliffDuration) {
            uint256 initialUnlockAmount = (tokenAmount * _initialPercentage) /
                _MAX_INITIAL_PERCENTAGE;
            uint256 passePeriod = Math.min(
                (block.timestamp - _endDate - info.cliffDuration) /
                    info.periodDuration,
                info.countPeriodOfVesting
            );
            return
                (((tokenAmount - initialUnlockAmount) * passePeriod) /
                    info.countPeriodOfVesting) + initialUnlockAmount;
        } else {
            return 0;
        }
    }

    /// @notice Compute unlocking amount of reward tokens to recipient for interval vesting
    /// @dev Compute unlocking amount of reward tokens to recipient for interval vesting
    /// @param intervals An array of structures that stores both the date and amount of unlocking for interval vesting
    /// @param tokenAmount Available reward token amount
    /// @param intervalIndex The index of interval that is already unlocked
    /// @return Unlocked amount of reward tokens
    function _calculateIntervalUnlock(
        Interval[] memory intervals,
        uint256 tokenAmount,
        uint256 intervalIndex
    ) internal view virtual returns (uint256) {
        uint256 unlockPercentage = _initialPercentage;
        if (intervalIndex > 0) {
            require(
                intervals[intervalIndex].timestamp < block.timestamp,
                "Incorrect interval index"
            );
            unlockPercentage = intervals[intervalIndex].percentage;
        } else {
            for (uint256 i = 0; i < intervals.length; i++) {
                if (block.timestamp > intervals[i].timestamp) {
                    unlockPercentage = intervals[i].percentage;
                } else {
                    break;
                }
            }
        }

        return (tokenAmount * unlockPercentage) / _MAX_INITIAL_PERCENTAGE;
    }

    /// @notice Define if vesting is started
    /// @dev Define if current date will be greater than end date of sale
    /// @return Bool whether vesting is started
    function _isVestingStarted() internal view returns (bool) {
        return block.timestamp > _endDate && _endDate != 0;
    }

    /// @notice Define if sale is started
    /// @dev Define if current date will be greater than start date of sale and less than end date
    /// @return Bool whether sale is started
    function _isSale() internal view returns (bool) {
        return block.timestamp >= _startDate && block.timestamp < _endDate;
    }

    /// @notice Define if amount to deposit is validate
    /// @dev Define if deposit amount is in allocation range and not greater than remaining amount
    /// @return Bool whether amount is valid
    function _isValidAmount(uint256 amount_) internal view returns (bool) {
        uint256 maxAllocation = specificAllocation[_msgSender()] > 0
            ? specificAllocation[_msgSender()]
            : _maxAllocation;
        uint256 depositAmount = deposited[_msgSender()];
        uint256 remainingAmount = Math.min(
            maxAllocation - depositAmount,
            convertToCurrency(_totalSupply) - _totalDeposited
        );
        return
            (amount_ < _minAllocation && depositAmount == 0) ||
                (amount_ > maxAllocation || amount_ > remainingAmount)
                ? false
                : true;
    }

    /// @notice Change decimals of some amount
    /// @dev Multiply or divide some amount by difference of decimals
    /// @param amount_ The amount that should change its decimals
    /// @param fromDecimals_ Decimals before convering
    /// @param toDecimals_ Decimals after convering
    /// @return Modified amount
    function _convertToCorrectDecimals(
        uint256 amount_,
        uint256 fromDecimals_,
        uint256 toDecimals_
    ) internal pure returns (uint256) {
        if (fromDecimals_ < toDecimals_) {
            amount_ = amount_ * (10**(toDecimals_ - fromDecimals_));
        } else if (fromDecimals_ > toDecimals_) {
            amount_ = amount_ / (10**(fromDecimals_ - toDecimals_));
        }
        return amount_;
    }
}
