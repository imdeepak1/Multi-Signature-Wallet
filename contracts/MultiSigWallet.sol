// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

contract MultiSigWallet {
    
    address[] public owners;
   
    mapping(address => bool) public isOwners;
    uint public required;
    struct Transaction {
        address to;
        uint value;
        bytes data;
        bool executed;
    }

    // ["0xAb8483F64d9C6d1EcF9b849Ae677dD3315835cb2","0x4B20993Bc481177ec7E8f571ceCaE8A9e22C02db"]
    
    event DepositFunds(address from, uint amount);
    event Submit(uint transactionId);
    event Approve(address owner, uint transactionId);
    event Revoke(address owner, uint transactionId);
    event Execute(uint transactionId);
    Transaction[] public transactions;
    mapping(uint => mapping(address => bool)) public approved;
    
    modifier onlyOwner(){
        require(isOwners[msg.sender],"caller is not owner");
        _;
    }
    modifier transactionExist(uint _transactionId){
        require(_transactionId < transactions.length,"Transaction is not exist");
        _;
    }
    modifier notApproved(uint _transactionId){
        require(!approved[_transactionId][msg.sender], "Transaction is already approved");
        _;
    }
   modifier notExecuted(uint _transactionId){
        require(!transactions[_transactionId].executed, "Transaction is already executed");
        _;
    }
    constructor(address[] memory _owners,uint _required){
        require(_owners.length>0,"Owners required");
        require(_required == _owners.length && _required>0,"Invalid required numbers of owners");
        for(uint i; i<_owners.length; i++){
            address owner = _owners[i];
            require(owner != address(0),"invaild owner");
            require(!isOwners[owner],"owner is not unique");
            isOwners[owner] =true;
            owners.push(owner);
        }
        required = _required; 
    }
    
    receive() external payable{
        emit DepositFunds(msg.sender, msg.value);
    }

    function submit(address _to, uint _value, bytes calldata _data) public onlyOwner {
        transactions.push(Transaction({to:_to, value:_value, data:_data, executed:false }));
        emit Submit(transactions.length -1);
    }  
    function approve(uint _transactionId) public onlyOwner transactionExist(_transactionId) notExecuted(_transactionId) notApproved(_transactionId) {
        approved[_transactionId][msg.sender] =true;
        emit Approve(msg.sender, _transactionId);

    } 
    function _getApprovalCount(uint _transactionId) private view returns(uint count) {
        for(uint i; i < owners.length;i++){
            if(approved[_transactionId][owners[i]]){
                count += 1;
            }
        }
        return count;
    }
    function execute(uint _transactionId) public transactionExist(_transactionId) notExecuted(_transactionId){
        require(_getApprovalCount(_transactionId) >= required,"Approvals are less then the required");
        Transaction storage transaction = transactions[_transactionId];
        transaction.executed =true;
        (bool success,) = transaction.to.call{value: transaction.value}(transaction.data);
        require(success, "transaction failled"); 
        emit Execute(_transactionId);
    }
    
    function revoke(uint _transactionId) public onlyOwner transactionExist(_transactionId) notExecuted(_transactionId){
        require(approved[_transactionId][msg.sender],"transaction not approved");
        approved[_transactionId][msg.sender] =false;
        emit Revoke(msg.sender , _transactionId);
    } 
}