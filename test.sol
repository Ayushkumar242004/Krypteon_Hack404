// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// ⚠ EDUCATIONAL PURPOSES ONLY — DO NOT DEPLOY TO MAINNET
contract VulnerableShort {
    address public owner;
    mapping(address => uint256) public balances;

    constructor() {
        owner = msg.sender;
    }

    // ❌ VULNERABILITY 1: Reentrancy
    function deposit() external payable {
        balances[msg.sender] += msg.value;
    }

    // Sends ETH before updating state (classic reentrancy)
    function withdraw(uint256 amount) external {
        require(balances[msg.sender] >= amount, "Not enough balance");
        (bool success, ) = msg.sender.call{value: amount}(""); // external call first
        require(success, "Transfer failed");
        balances[msg.sender] -= amount; // state update after external call
    }

    // ❌ VULNERABILITY 2: tx.origin Authentication
    // An attacker can trick the owner into calling via a malicious contract
    function dangerousOwnerFunction() external {
        require(tx.origin == owner, "Not owner");
        // critical action
        owner = msg.sender; // attacker can become owner if owner is phished
    }

    // ❌ VULNERABILITY 3: Unprotected selfdestruct
    function kill() external {
        // Anyone can destroy the contract and steal remaining ETH
        selfdestruct(payable(msg.sender));
    }

    // ❌ VULNERABILITY 4: Integer Overflow (if unchecked is misused)
    uint256 public counter;

    function incrementUnchecked(uint256 value) external {
        unchecked { // disables overflow checks
            counter += value;
        }
    }

    // ❌ VULNERABILITY 5: Missing Access Control
    // Anyone can change the owner
    function changeOwner(address newOwner) external {
        owner = newOwner;
    }
}