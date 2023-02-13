import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract } from "ethers";

describe("ERC20 Contract Test Cases", function () {
  let multiSigInstanse: Contract,
    multiSigInstanseTwo: Contract,
    abiCode: any,
    ownerOne: any,
    ownerTwo: any,
    receiver: any,
    contractAddr: any;
  const addrZero = "0x0000000000000000000000000000000000000000";
  async function deployERC20Fixture() {
    [ownerOne, ownerTwo, receiver] = await ethers.getSigners();
    abiCode = await ethers.getContractFactory("MultiSigWallet");
    multiSigInstanse = await abiCode.deploy(
      [ownerOne.address, ownerTwo.address],
      2
    );
    contractAddr = multiSigInstanse.address;
    return { multiSigInstanse, ownerOne, ownerTwo, receiver };
  }




  describe("Contract Deployment", async function () {
    it("Return Error if Owners not provided at contract deloyment", async function () {
      async function deployERC20Fixture() {
        abiCode = await ethers.getContractFactory("MultiSigWallet");
        await abiCode.deploy([], 0);
      }
      await expect(loadFixture(deployERC20Fixture)).to.be.revertedWith(
        "Owners required"
      );
    });
    it("Return Error if Invalid required numbers of owners is given", async function () {
      async function deployERC20Fixture() {
        [ownerOne, ownerTwo] = await ethers.getSigners();
        abiCode = await ethers.getContractFactory("MultiSigWallet");
        const av = await abiCode.deploy(
          [ownerOne.address, ownerTwo.address],
          0
        );
      }
      await expect(loadFixture(deployERC20Fixture)).to.be.revertedWith(
        "Invalid required numbers of owners"
      );
    });
    it("Return Error if invaild owner", async function () {
      async function deployERC20Fixture3() {
        [ownerOne, ownerTwo] = await ethers.getSigners();
        abiCode = await ethers.getContractFactory("MultiSigWallet");
        await abiCode.deploy([addrZero, ownerTwo.address], 2);
      }
      await expect(loadFixture(deployERC20Fixture3)).to.be.revertedWith(
        "invaild owner"
      );
    });

    it("Return Error if owner is not unique", async function () {
      async function deployERC20Fixture() {
        [ownerOne, ownerTwo] = await ethers.getSigners();
        abiCode = await ethers.getContractFactory("MultiSigWallet");
        await abiCode.deploy([ownerOne.address, ownerOne.address], 2);
      }
      await expect(loadFixture(deployERC20Fixture)).to.be.revertedWith(
        "owner is not unique"
      );
    });

    it("Address of Owner should be set correctly", async function () {
      const { multiSigInstanse } = await loadFixture(deployERC20Fixture);
      expect(await multiSigInstanse.isOwners(ownerOne.address)).to.equal(true);
      expect(await multiSigInstanse.isOwners(ownerTwo.address)).to.equal(true);
    });

    it("Required Approval should be equal to Owner array length", async function () {
      expect(await multiSigInstanse.required.call()).to.equal(2);
    });

    it("Should be receive invoke", async () => {
      const response = await ownerOne.sendTransaction({
        to: multiSigInstanse.address,
        value: ethers.utils.parseEther("1"),
      });
      await expect(response)
        .to.emit(multiSigInstanse, "DepositFunds")
        .withArgs(ownerOne.address, ethers.utils.parseEther("1"));
    });
  });




  describe("Submiting Transaction", function () {
    it("Return Error if caller is not owner", async function () {
      await expect(
        multiSigInstanse
          .connect(receiver)
          .submit(receiver.address, "10000", "0x00")
      ).to.be.revertedWith("caller is not owner");
    });

    it("Transaction should be submit successfully", async function () {
      await multiSigInstanse.submit(receiver.address, "1000", "0x00", {
        from: ownerOne.address,
      });
      const tx = await multiSigInstanse.transactions(0);
      expect(tx.to).to.equal(receiver.address);
    });

    it("Submit event should be emit successfully", async function () {
      await expect(
        multiSigInstanse.submit(receiver.address, "10000", "0x00", {
          from: ownerOne.address,
        })
      )
        .to.emit(multiSigInstanse, "Submit")
        .withArgs("1");
    });
  });




  describe("Approve Transaction", function () {
    it("Approve should be successfully", async function () {
      await multiSigInstanse.connect(ownerOne).approve("0");
      await multiSigInstanse.connect(ownerTwo).approve("0");
      const tx = await multiSigInstanse.approved("0", ownerOne.address);
      expect(tx).to.equal(true);
      const tx1 = await multiSigInstanse.approved("0", ownerTwo.address);
      expect(tx1).to.equal(true);
    });

    it("Approve event should be emit successfully", async function () {
      expect(multiSigInstanse.connect(ownerOne).approve(0))
        .to.emit(multiSigInstanse, "Approve")
        .withArgs(ownerOne.address, "0");
    });
  
    it("Return Error if caller is not owner", async function () {
      await expect(
        multiSigInstanse.connect(receiver).approve(0)
      ).to.be.revertedWith("caller is not owner");
    });

    it("Return Error if Transaction is not exist", async function () {
      await expect(
        multiSigInstanse.approve(3, { from: ownerOne.address })
      ).to.be.revertedWith("Transaction is not exist");
    });

    it("Return Error if Transaction is already approved", async function () {
      await expect(
        multiSigInstanse.approve(0, { from: ownerOne.address })
      ).to.be.revertedWith("Transaction is already approved");
    });
  });




  describe("Execute Transaction", function () {
    it("Return Error if Approvals are less than the required", async function () {
      await expect(multiSigInstanse.execute(1)).to.be.revertedWith(
        "Approvals are less then the required"
      );
    });
    it("Return Error if Transaction is not exist", async function () {
      await expect(multiSigInstanse.execute(4)).to.be.revertedWith(
        "Transaction is not exist"
      );
    });
    it("Execute function should be run successfully", async function () {
      const ab =  await multiSigInstanse.execute(0);
      const tx = await multiSigInstanse.transactions(0);
      expect(tx.executed).to.equal(true);
    });
    it("Return Error if Transaction is already executed", async function () {
      await expect(
        multiSigInstanse.execute(0, { from: ownerOne.address })
      ).to.be.revertedWith("Transaction is already executed");
    });
    it("Execute event should be emit successfully", async function () {
      expect(multiSigInstanse.execute(0, { from: ownerOne.address }))
        .to.emit(multiSigInstanse, "Execute")
        .withArgs(1);
    });
    it("Return Error if Transaction is already executed(From Approve Function)", async function () {
      await expect(
        multiSigInstanse.approve(0, { from: ownerOne.address })
      ).to.be.revertedWith("Transaction is already executed");
    });
    async function deployERC20Fixture2() {
      [ownerOne, ownerTwo, receiver] = await ethers.getSigners();
      abiCode = await ethers.getContractFactory("MultiSigWallet");
      multiSigInstanseTwo = await abiCode.deploy(
        [ownerOne.address, ownerTwo.address],
        2
      );
      return { multiSigInstanseTwo, ownerOne, ownerTwo, receiver };
    }
    it("Return Error if transaction failled because of insufficient fund", async function () {
      const { multiSigInstanseTwo } = await loadFixture(deployERC20Fixture2);
      await multiSigInstanseTwo.submit(receiver.address, "10000", "0x00", {
        from: ownerOne.address,
      });
      await multiSigInstanseTwo.connect(ownerOne).approve("0");
      await multiSigInstanseTwo.connect(ownerTwo).approve("0");
      await expect(multiSigInstanseTwo.execute(0)).to.be.revertedWith(
        "transaction failled"
      );
    });
  });



  
  describe("Revoke Transaction Approval", function () {
    it("Return Error if caller is not owner", async function () {
      await expect(
        multiSigInstanse.connect(receiver).revoke(1)
      ).to.be.revertedWith("caller is not owner");
    });
    it("Return Error if Transaction is not exist", async function () {
      await expect(
        multiSigInstanse.revoke(3, { from: ownerOne.address })
      ).to.be.revertedWith("Transaction is not exist");
    });
    it("Return Error if Transaction is already executed", async function () {
      await expect(
        multiSigInstanse.revoke(0, { from: ownerOne.address })
      ).to.be.revertedWith("Transaction is already executed");
    });
    it("Return Error if transaction not approved", async function () {
      await expect(multiSigInstanse.revoke(1)).to.be.revertedWith(
        "transaction not approved"
      );
    });
    it("Revoke should be done", async function () {
      await multiSigInstanse.connect(ownerOne).approve(1);
      await multiSigInstanse.connect(ownerOne).revoke(1);
      const tx = await multiSigInstanse.approved("1", ownerOne.address);
      expect(tx).to.equal(false);
    });
    it("Revoke event should be emit successfully", async function () {
      await multiSigInstanse.connect(ownerOne).approve("1");
      await expect(multiSigInstanse.revoke("1", { from: ownerOne.address }))
        .to.emit(multiSigInstanse, "Revoke")
        .withArgs(ownerOne.address, "1");
    });
  });
});
