const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("ClubTreasuryDAO Smart Contract", function () {
  let dao;
  let owner, member1, member2, member3, nonMember;
  const initialFunding = ethers.parseEther("10.0"); // 10 ETH in treasury
  const quorumPercentage = 30; // 30%

  beforeEach(async function () {
    [owner, member1, member2, member3, nonMember] = await ethers.getSigners();

    const ClubTreasuryDAO = await ethers.getContractFactory("ClubTreasuryDAO");
    dao = await ClubTreasuryDAO.deploy(
      "Blockchain Innovators Club",
      "Decentralized treasury for university club projects & events",
      quorumPercentage,
      { value: initialFunding }
    );
    await dao.waitForDeployment();
  });

  describe("Deployment & Initial State", function () {
    it("should initialize club metadata and admin correctly", async function () {
      expect(await dao.clubName()).to.equal("Blockchain Innovators Club");
      expect(await dao.clubDescription()).to.equal(
        "Decentralized treasury for university club projects & events"
      );
      expect(await dao.admin()).to.equal(owner.address);
      expect(await dao.quorumPercentage()).to.equal(30n);
    });

    it("should set deployer as the first member with initial funding", async function () {
      expect(await dao.isMember(owner.address)).to.be.true;
      expect(await dao.memberCount()).to.equal(1n);
      expect(await dao.getTreasuryBalance()).to.equal(initialFunding);
    });
  });

  describe("Membership Management", function () {
    it("should allow any user to join the club", async function () {
      await expect(dao.connect(member1).joinClub())
        .to.emit(dao, "MemberJoined")
        .withArgs(member1.address, 2n);

      expect(await dao.isMember(member1.address)).to.be.true;
      expect(await dao.memberCount()).to.equal(2n);
    });

    it("should prevent a member from joining twice", async function () {
      await dao.connect(member1).joinClub();
      await expect(dao.connect(member1).joinClub()).to.be.revertedWith(
        "Already a registered club member"
      );
    });

    it("should allow admin to manually add a member", async function () {
      await expect(dao.connect(owner).addMember(member2.address))
        .to.emit(dao, "MemberAdded")
        .withArgs(owner.address, member2.address, 2n);

      expect(await dao.isMember(member2.address)).to.be.true;
    });

    it("should prevent non-admin from adding members", async function () {
      await expect(
        dao.connect(member1).addMember(member2.address)
      ).to.be.revertedWith("Access denied: Only admin can call this");
    });
  });

  describe("Treasury Funding & Deposits", function () {
    it("should accept direct ETH deposits via receive()", async function () {
      const depositAmount = ethers.parseEther("2.5");
      await expect(
        member1.sendTransaction({
          to: await dao.getAddress(),
          value: depositAmount,
        })
      )
        .to.emit(dao, "FundsDeposited")
        .withArgs(member1.address, depositAmount, initialFunding + depositAmount);

      expect(await dao.getTreasuryBalance()).to.equal(initialFunding + depositAmount);
    });

    it("should accept deposits via deposit() function", async function () {
      const depositAmount = ethers.parseEther("1.0");
      await expect(dao.connect(member1).deposit({ value: depositAmount }))
        .to.emit(dao, "FundsDeposited")
        .withArgs(member1.address, depositAmount, initialFunding + depositAmount);
    });
  });

  describe("Proposal Creation", function () {
    beforeEach(async function () {
      await dao.connect(member1).joinClub();
    });

    it("should allow a registered member to create a valid proposal", async function () {
      const requestAmount = ethers.parseEther("2.0");
      const duration = 300; // 5 minutes

      await expect(
        dao
          .connect(member1)
          .createProposal(
            "Hackathon Catering",
            "Sponsorship for pizza and refreshments during 24h event",
            requestAmount,
            duration
          )
      )
        .to.emit(dao, "ProposalCreated")
        .withArgs(0n, member1.address, "Hackathon Catering", requestAmount, (val) => val > 0);

      const prop = await dao.getProposal(0);
      expect(prop.title).to.equal("Hackathon Catering");
      expect(prop.amount).to.equal(requestAmount);
      expect(prop.proposer).to.equal(member1.address);
      expect(prop.executed).to.be.false;
      expect(prop.status).to.equal(0n); // Active
    });

    it("should reject proposal creation from non-members", async function () {
      await expect(
        dao
          .connect(nonMember)
          .createProposal("Books", "Buy study books", ethers.parseEther("1.0"), 300)
      ).to.be.revertedWith("Access denied: Only club members can call this");
    });

    it("should reject proposal requesting more than treasury balance", async function () {
      const excessAmount = ethers.parseEther("15.0"); // Treasury only has 10 ETH
      await expect(
        dao
          .connect(member1)
          .createProposal("Excessive Request", "Need 15 ETH", excessAmount, 300)
      ).to.be.revertedWith("Requested amount exceeds current treasury balance");
    });

    it("should reject proposal with empty title or invalid duration", async function () {
      await expect(
        dao.connect(member1).createProposal("", "Desc", ethers.parseEther("1.0"), 300)
      ).to.be.revertedWith("Proposal title cannot be empty");

      await expect(
        dao
          .connect(member1)
          .createProposal("Title", "Desc", ethers.parseEther("1.0"), 30) // < 60 seconds
      ).to.be.revertedWith("Duration outside allowable range");
    });
  });

  describe("Voting Mechanics", function () {
    const duration = 300;
    const requestAmount = ethers.parseEther("1.5");

    beforeEach(async function () {
      await dao.connect(member1).joinClub();
      await dao.connect(member2).joinClub();
      await dao.connect(member3).joinClub();
      // Total members: owner, member1, member2, member3 = 4 members

      await dao
        .connect(member1)
        .createProposal("Hardware Lab Equipment", "Arduino & sensors", requestAmount, duration);
    });

    it("should allow members to vote FOR and AGAINST", async function () {
      await expect(dao.connect(member2).vote(0, true))
        .to.emit(dao, "Voted")
        .withArgs(0n, member2.address, true, 1n, 0n);

      await expect(dao.connect(member3).vote(0, false))
        .to.emit(dao, "Voted")
        .withArgs(0n, member3.address, false, 1n, 1n);

      const prop = await dao.getProposal(0);
      expect(prop.votesFor).to.equal(1n);
      expect(prop.votesAgainst).to.equal(1n);
      expect(prop.totalVotes).to.equal(2n);
    });

    it("should prevent proposer from voting on their own proposal", async function () {
      await expect(dao.connect(member1).vote(0, true)).to.be.revertedWith(
        "Proposer cannot vote on their own proposal"
      );
    });

    it("should prevent double voting by the same member", async function () {
      await dao.connect(member2).vote(0, true);
      await expect(dao.connect(member2).vote(0, false)).to.be.revertedWith(
        "Member has already voted on this proposal"
      );
    });

    it("should prevent non-members from voting", async function () {
      await expect(dao.connect(nonMember).vote(0, true)).to.be.revertedWith(
        "Access denied: Only club members can call this"
      );
    });

    it("should prevent voting after the deadline has expired", async function () {
      await time.increase(duration + 10);
      await expect(dao.connect(member2).vote(0, true)).to.be.revertedWith(
        "Voting deadline has passed"
      );
    });
  });

  describe("Execution & Fund Transfer", function () {
    const duration = 300;
    const requestAmount = ethers.parseEther("2.0");

    beforeEach(async function () {
      await dao.connect(member1).joinClub();
      await dao.connect(member2).joinClub();
      await dao.connect(member3).joinClub();
      // 4 members: owner, member1, member2, member3
      // Quorum 30% of 4 = 1.2 -> ceiling is 2 votes required!

      await dao
        .connect(member1)
        .createProposal("Conference Tickets", "Tickets for Web3 Summit", requestAmount, duration);
    });

    it("should execute proposal and transfer ETH automatically when passed", async function () {
      // 2 votes FOR out of 4 members -> Quorum (2 >= 2) met! votesFor (2) > votesAgainst (0)
      await dao.connect(owner).vote(0, true);
      await dao.connect(member2).vote(0, true);

      // Fast forward past deadline
      await time.increase(duration + 1);

      // Check status is Passed
      expect(await dao.getProposalStatus(0)).to.equal(1n); // Passed

      const proposerBalanceBefore = await ethers.provider.getBalance(member1.address);
      const treasuryBalanceBefore = await dao.getTreasuryBalance();

      // Execute proposal
      await expect(dao.connect(member3).executeProposal(0))
        .to.emit(dao, "ProposalExecuted")
        .withArgs(0n, member1.address, requestAmount);

      const proposerBalanceAfter = await ethers.provider.getBalance(member1.address);
      const treasuryBalanceAfter = await dao.getTreasuryBalance();

      expect(proposerBalanceAfter - proposerBalanceBefore).to.equal(requestAmount);
      expect(treasuryBalanceBefore - treasuryBalanceAfter).to.equal(requestAmount);

      const prop = await dao.getProposal(0);
      expect(prop.executed).to.be.true;
      expect(prop.status).to.equal(3n); // Executed
    });

    it("should prevent execution before the deadline", async function () {
      await dao.connect(owner).vote(0, true);
      await dao.connect(member2).vote(0, true);

      await expect(dao.connect(owner).executeProposal(0)).to.be.revertedWith(
        "Voting deadline has not passed yet"
      );
    });

    it("should revert execution if quorum is not reached", async function () {
      // Only 1 vote cast (needed 2 for quorum of 4 members)
      await dao.connect(owner).vote(0, true);

      await time.increase(duration + 1);
      expect(await dao.getProposalStatus(0)).to.equal(2n); // Rejected due to quorum

      await expect(dao.connect(owner).executeProposal(0)).to.be.revertedWith(
        "Quorum not reached: insufficient voter participation"
      );
    });

    it("should revert execution if proposal was rejected by majority", async function () {
      // 1 vote FOR, 2 votes AGAINST
      await dao.connect(owner).vote(0, true);
      await dao.connect(member2).vote(0, false);
      await dao.connect(member3).vote(0, false);

      await time.increase(duration + 1);
      expect(await dao.getProposalStatus(0)).to.equal(2n); // Rejected

      await expect(dao.connect(owner).executeProposal(0)).to.be.revertedWith(
        "Proposal rejected: FOR votes must exceed AGAINST votes"
      );
    });

    it("should prevent executing an already executed proposal", async function () {
      await dao.connect(owner).vote(0, true);
      await dao.connect(member2).vote(0, true);
      await time.increase(duration + 1);

      await dao.connect(owner).executeProposal(0);

      await expect(dao.connect(owner).executeProposal(0)).to.be.revertedWith(
        "Proposal has already been executed"
      );
    });
  });

  describe("Club Statistics & Batch Getters", function () {
    it("should return accurate club overview stats", async function () {
      await dao.connect(member1).joinClub();
      await dao.connect(member2).joinClub();

      const stats = await dao.getClubStats();
      expect(stats.treasuryBalance).to.equal(initialFunding);
      expect(stats.totalMembers).to.equal(3n);
      expect(stats.totalProposals).to.equal(0n);
      expect(stats.requiredQuorumPct).to.equal(30n);
      expect(stats.minVotesNeeded).to.equal(1n); // ceil(3 * 30 / 100) = 1
    });

    it("should list all registered members", async function () {
      await dao.connect(member1).joinClub();
      const list = await dao.getMemberList();
      expect(list).to.include(owner.address);
      expect(list).to.include(member1.address);
      expect(list.length).to.equal(2);
    });
  });
});
