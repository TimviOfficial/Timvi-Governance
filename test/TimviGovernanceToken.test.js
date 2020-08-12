const {constants, expectEvent, expectRevert } = require('openzeppelin-test-helpers');
const { ZERO_ADDRESS } = constants;

const TDAOToken = artifacts.require('TimviGovernanceTokenMock');

const BN = web3.utils.BN;
const { expect } = require('chai');

const BigNumber = BN;

contract('Timvi Governance Token', function ([_, owner, recipient, anotherAccount]) {
    beforeEach(async function () {
        this.token = await TDAOToken.new();
        await this.token.transfer(owner, new BN(100));
    });

    it('has a name', async function() {
        expect(await this.token.name()).to.equal('Timvi Governance Token');
    });

    it('has a symbol', async function() {
        expect(await this.token.symbol()).to.equal('GTMV');
    });

    it('has 18 decimals', async function() {
        expect(await this.token.decimals()).to.be.bignumber.equal(
            new BN(18)
        );
    });

    describe('total supply', function () {
        it('returns the total amount of tokens', async function () {
            let supply = new BN((await this.token.totalSupply()).toString());
            expect(supply).to.be.bignumber.equal(new BN('300000000000000000000000000'));
        });
    });

    describe('balanceOf', function () {
        describe('when the requested account has no tokens', function () {
            it('returns zero', async function () {
                expect((await this.token.balanceOf(anotherAccount))).to.be.bignumber.equal(new BN(0));
            });
        });

        describe('when the requested account has some tokens', function () {
            it('returns the total amount of tokens', async function () {
                expect((await this.token.balanceOf(owner))).to.be.bignumber.equal(new BN(100));
            });
        });
    });

    describe('transfer', function () {
        describe('when the recipient is not the zero address', function () {
            const to = recipient;

            describe('when the sender does not have enough balance', function () {
                const amount = new BN(101);

                it('reverts', async function () {
                    await expectRevert.unspecified(this.token.transfer(to, amount, { from: owner }));
                });
            });

            describe('when the sender has enough balance', function () {
                const amount = new BN(100);

                it('transfers the requested amount', async function () {
                    await this.token.transfer(to, amount, { from: owner });

                    expect((await this.token.balanceOf(owner))).to.be.bignumber.equal(new BN(0));

                    expect((await this.token.balanceOf(to))).to.be.bignumber.equal(new BN(amount));
                });

                it('emits a transfer event', async function () {
                    const { logs } = await this.token.transfer(to, amount, { from: owner });

                    expectEvent.inLogs(logs, 'Transfer', {
                        from: owner,
                        to: to,
                        value: amount,
                    });
                });
            });
        });

        describe('when the recipient is the zero address', function () {
            const to = ZERO_ADDRESS;

            it('reverts', async function () {
                await expectRevert.unspecified(this.token.transfer(to, 100, { from: owner }));
            });
        });
    });

    describe('approve', function () {
        describe('when the spender is not the zero address', function () {
            const spender = recipient;

            describe('when the sender has enough balance', function () {
                const amount = new BN(100);

                it('emits an approval event', async function () {
                    const { logs } = await this.token.approve(spender, amount, { from: owner });

                    expectEvent.inLogs(logs, 'Approval', {
                        owner: owner,
                        spender: spender,
                        value: amount,
                    });
                });

                describe('when there was no approved amount before', function () {
                    it('approves the requested amount', async function () {
                        await this.token.approve(spender, amount, { from: owner });

                        expect((await this.token.allowance(owner, spender))).to.be.bignumber.equal(amount);
                    });
                });

                describe('when the spender had an approved amount', function () {
                    beforeEach(async function () {
                        await this.token.approve(spender, 1, { from: owner });
                    });

                    it('approves the requested amount and replaces the previous one', async function () {
                        await this.token.approve(spender, amount, { from: owner });

                        expect((await this.token.allowance(owner, spender))).to.be.bignumber.equal(amount);
                    });
                });
            });

            describe('when the sender does not have enough balance', function () {
                const amount = new BN(101);

                it('emits an approval event', async function () {
                    const { logs } = await this.token.approve(spender, amount, { from: owner });

                    expectEvent.inLogs(logs, 'Approval', {
                        owner: owner,
                        spender: spender,
                        value: amount,
                    });
                });

                describe('when there was no approved amount before', function () {
                    it('approves the requested amount', async function () {
                        await this.token.approve(spender, amount, { from: owner });

                        expect((await this.token.allowance(owner, spender))).to.be.bignumber.equal(amount);
                    });
                });

                describe('when the spender had an approved amount', function () {
                    beforeEach(async function () {
                        await this.token.approve(spender, 1, { from: owner });
                    });

                    it('approves the requested amount and replaces the previous one', async function () {
                        await this.token.approve(spender, amount, { from: owner });

                        expect((await this.token.allowance(owner, spender))).to.be.bignumber.equal(amount);
                    });
                });
            });
        });

        describe('when the spender is the zero address', function () {
            const amount = new BN(100);
            const spender = ZERO_ADDRESS;

            it('reverts', async function () {
                await expectRevert.unspecified(this.token.approve(spender, amount, { from: owner }));
            });
        });
    });

    describe('transfer from', function () {
        const spender = recipient;

        describe('when the recipient is not the zero address', function () {
            const to = anotherAccount;

            describe('when the spender has enough approved balance', function () {
                beforeEach(async function () {
                    await this.token.approve(spender, 100, { from: owner });
                });

                describe('when the owner has enough balance', function () {
                    const amount = new BN(100);

                    it('transfers the requested amount', async function () {
                        await this.token.transferFrom(owner, to, amount, { from: spender });

                        expect((await this.token.balanceOf(owner))).to.be.bignumber.equal(new BN(0));

                        expect((await this.token.balanceOf(to))).to.be.bignumber.equal(amount);
                    });

                    it('decreases the spender allowance', async function () {
                        await this.token.transferFrom(owner, to, amount, { from: spender });

                        expect((await this.token.allowance(owner, spender))).to.be.bignumber.equal(new BN(0));
                    });

                    it('emits a transfer event', async function () {
                        const { logs } = await this.token.transferFrom(owner, to, amount, { from: spender });

                        expectEvent.inLogs(logs, 'Transfer', {
                            from: owner,
                            to: to,
                            value: amount,
                        });
                    });
                });

                describe('when the owner does not have enough balance', function () {
                    const amount = new BN(101);

                    it('reverts', async function () {
                        await expectRevert.unspecified(this.token.transferFrom(owner, to, amount, { from: spender }));
                    });
                });
            });

            describe('when the spender does not have enough approved balance', function () {
                beforeEach(async function () {
                    await this.token.approve(spender, 99, { from: owner });
                });

                describe('when the owner has enough balance', function () {
                    const amount = new BN(100);

                    it('reverts', async function () {
                        await expectRevert.unspecified(this.token.transferFrom(owner, to, amount, { from: spender }));
                    });
                });

                describe('when the owner does not have enough balance', function () {
                    const amount = new BN(101);

                    it('reverts', async function () {
                        await expectRevert.unspecified(this.token.transferFrom(owner, to, amount, { from: spender }));
                    });
                });
            });
        });

        describe('when the recipient is the zero address', function () {
            const amount = new BN(100);
            const to = ZERO_ADDRESS;

            beforeEach(async function () {
                await this.token.approve(spender, amount, { from: owner });
            });

            it('reverts', async function () {
                await expectRevert.unspecified(this.token.transferFrom(owner, to, amount, { from: spender }));
            });
        });
    });

    describe('decrease allowance', function () {
        describe('when the spender is not the zero address', function () {
            const spender = recipient;

            function shouldDecreaseApproval (amount) {
                describe('when there was no approved amount before', function () {
                    it('reverts', async function () {
                        await expectRevert.unspecified(this.token.decreaseAllowance(spender, amount, { from: owner }));
                    });
                });

                describe('when the spender had an approved amount', function () {
                    const approvedAmount = amount;

                    beforeEach(async function () {
                        ({ logs: this.logs } = await this.token.approve(spender, approvedAmount, { from: owner }));
                    });

                    it('emits an approval event', async function () {
                        const { logs } = await this.token.decreaseAllowance(spender, approvedAmount, { from: owner });

                        expectEvent.inLogs(logs, 'Approval', {
                            owner: owner,
                            spender: spender,
                            value: new BN(0),
                        });
                    });

                    it('decreases the spender allowance subtracting the requested amount', async function () {
                        await this.token.decreaseAllowance(spender, approvedAmount - 1, { from: owner });

                        expect((await this.token.allowance(owner, spender))).to.be.bignumber.equal(new BN(1));
                    });

                    it('sets the allowance to zero when all allowance is removed', async function () {
                        await this.token.decreaseAllowance(spender, approvedAmount, { from: owner });
                        expect((await this.token.allowance(owner, spender))).to.be.bignumber.equal(new BN(0));
                    });

                    it('reverts when more than the full allowance is removed', async function () {
                        await expectRevert.unspecified(this.token.decreaseAllowance(spender, approvedAmount + 1, { from: owner }));
                    });
                });
            }

            describe('when the sender has enough balance', function () {
                const amount = new BN(100);

                shouldDecreaseApproval(amount);
            });

            describe('when the sender does not have enough balance', function () {
                const amount = new BN(101);

                shouldDecreaseApproval(amount);
            });
        });

        describe('when the spender is the zero address', function () {
            const amount = new BN(100);
            const spender = ZERO_ADDRESS;

            it('reverts', async function () {
                await expectRevert.unspecified(this.token.decreaseAllowance(spender, amount, { from: owner }));
            });
        });
    });

    describe('increase allowance', function () {
        const amount = new BN(100);

        describe('when the spender is not the zero address', function () {
            const spender = recipient;

            describe('when the sender has enough balance', function () {
                it('emits an approval event', async function () {
                    const { logs } = await this.token.increaseAllowance(spender, amount, { from: owner });

                    expectEvent.inLogs(logs, 'Approval', {
                        owner: owner,
                        spender: spender,
                        value: amount,
                    });
                });

                describe('when there was no approved amount before', function () {
                    it('approves the requested amount', async function () {
                        await this.token.increaseAllowance(spender, amount, { from: owner });

                        expect((await this.token.allowance(owner, spender))).to.be.bignumber.equal(amount);
                    });
                });

                describe('when the spender had an approved amount', function () {
                    beforeEach(async function () {
                        await this.token.approve(spender, 1, { from: owner });
                    });

                    it('increases the spender allowance adding the requested amount', async function () {
                        await this.token.increaseAllowance(spender, amount, { from: owner });

                        expect((await this.token.allowance(owner, spender))).to.be.bignumber.equal(amount.add(new BN(1)));
                    });
                });
            });

            describe('when the sender does not have enough balance', function () {
                const amount = new BN(101);

                it('emits an approval event', async function () {
                    const { logs } = await this.token.increaseAllowance(spender, amount, { from: owner });

                    expectEvent.inLogs(logs, 'Approval', {
                        owner: owner,
                        spender: spender,
                        value: amount,
                    });
                });

                describe('when there was no approved amount before', function () {
                    it('approves the requested amount', async function () {
                        await this.token.increaseAllowance(spender, amount, { from: owner });

                        expect((await this.token.allowance(owner, spender))).to.be.bignumber.equal(new BN(amount));
                    });
                });

                describe('when the spender had an approved amount', function () {
                    beforeEach(async function () {
                        await this.token.approve(spender, 1, { from: owner });
                    });

                    it('increases the spender allowance adding the requested amount', async function () {
                        await this.token.increaseAllowance(spender, amount, { from: owner });

                        expect((await this.token.allowance(owner, spender))).to.be.bignumber.equal(new BN(amount.add(new BN(1))));
                    });
                });
            });
        });

        describe('when the spender is the zero address', function () {
            const spender = ZERO_ADDRESS;

            it('reverts', async function () {
                await expectRevert.unspecified(this.token.increaseAllowance(spender, amount, { from: owner }));
            });
        });
    });

    describe('_mint', function () {
        const initialSupply = new BigNumber('300000000000000000000000000');
        const amount = new BigNumber(50);

        it('rejects a null account', async function () {
            await expectRevert.unspecified(this.token.mint(ZERO_ADDRESS, amount));
        });

        describe('for a non null account', function () {
            beforeEach('minting', async function () {
                const { logs } = await this.token.mint(recipient, amount);
                this.logs = logs;
            });

            it('increments totalSupply', async function () {
                const expectedSupply = initialSupply.add(amount);
                expect((await this.token.totalSupply())).to.be.bignumber.equal(new BN(expectedSupply));
            });

            it('increments recipient balance', async function () {
                expect((await this.token.balanceOf(recipient))).to.be.bignumber.equal(new BN(amount));
            });

            it('emits Transfer event', async function () {
                const event = expectEvent.inLogs(this.logs, 'Transfer', {
                    from: ZERO_ADDRESS,
                    to: recipient,
                });

                expect(event.args.value).to.be.bignumber.equal(amount);
            });
        });
    });
});
