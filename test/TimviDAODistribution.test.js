const { BN, time } = require('openzeppelin-test-helpers');
const { expect } = require('chai');

const LPToken = artifacts.require('LPTokenMock');
const RewardToken = artifacts.require('TimviGovernanceTokenMock');
const AdditionalRewardToken = artifacts.require('RandomTokenMock');
const Distribution = artifacts.require('Distribution');

async function timeJumpTo (seconds) {
    const delay = 10 - new Date().getMilliseconds();
    await new Promise(resolve => setTimeout(resolve, delay));
    await time.increaseTo(seconds);
}

const almostEqualDiv1e18 = function (expectedOrig, actualOrig) {
    const _1e18 = new BN('10').pow(new BN('18'));
    const expected = expectedOrig.div(_1e18);
    const actual = actualOrig.div(_1e18);
    this.assert(
        expected.eq(actual) ||
        expected.addn(1).eq(actual) || expected.addn(2).eq(actual) ||
        actual.addn(1).eq(expected) || actual.addn(2).eq(expected),
        'expected #{act} to be almost equal #{exp}',
        'expected #{act} to be different from #{exp}',
        expectedOrig.toString(),
        actualOrig.toString(),
    );
};

require('chai').use(function (chai, utils) {
    chai.Assertion.overwriteMethod('almostEqualDiv1e18', function (original) {
        return function (value) {
            if (utils.flag(this, 'bignumber')) {
                var expected = new BN(value);
                var actual = new BN(this._obj);
                almostEqualDiv1e18.apply(this, [expected, actual]);
            } else {
                original.apply(this, arguments);
            }
        };
    });
});

contract('TimviDAODistribution', function ([_, wallet1, wallet2, wallet3, wallet4]) {
    describe('TimviDAODistribution', async function () {
        beforeEach(async function () {
            this.lpToken = await LPToken.new();
            this.rewardToken = await RewardToken.new();
            this.distribution = await Distribution.new(this.rewardToken.address, this.lpToken.address);

            await this.distribution.setRewardDistribution(wallet1);

            await this.rewardToken.mint(this.distribution.address, web3.utils.toWei('1000000'));
            await this.lpToken.mint(wallet1, web3.utils.toWei('1000'));
            await this.lpToken.mint(wallet2, web3.utils.toWei('1000'));
            await this.lpToken.mint(wallet3, web3.utils.toWei('1000'));
            await this.lpToken.mint(wallet4, web3.utils.toWei('1000'));

            await this.lpToken.approve(this.distribution.address, new BN(2).pow(new BN(255)), { from: wallet1 });
            await this.lpToken.approve(this.distribution.address, new BN(2).pow(new BN(255)), { from: wallet2 });
            await this.lpToken.approve(this.distribution.address, new BN(2).pow(new BN(255)), { from: wallet3 });
            await this.lpToken.approve(this.distribution.address, new BN(2).pow(new BN(255)), { from: wallet4 });

            this.started = (await time.latest()).addn(10);
            await timeJumpTo(this.started);
        });

        it('Two stakers with the same stakes wait 1 w', async function () {
            // 72000 reward tokens per week
            await this.distribution.notifyRewardAmount(web3.utils.toWei('72000'), { from: wallet1 });

            expect(await this.distribution.rewardPerToken()).to.be.bignumber.almostEqualDiv1e18('0');
            expect(await this.distribution.earned(wallet1)).to.be.bignumber.equal('0');
            expect(await this.distribution.earned(wallet2)).to.be.bignumber.equal('0');

            await this.distribution.stake(web3.utils.toWei('1'), { from: wallet1 });
            await this.distribution.stake(web3.utils.toWei('1'), { from: wallet2 });

            expect(await this.distribution.rewardPerToken()).to.be.bignumber.almostEqualDiv1e18('0');
            expect(await this.distribution.earned(wallet1)).to.be.bignumber.equal('0');
            expect(await this.distribution.earned(wallet2)).to.be.bignumber.equal('0');

            await timeJumpTo(this.started.add(time.duration.weeks(1)));

            expect(await this.distribution.rewardPerToken()).to.be.bignumber.almostEqualDiv1e18(web3.utils.toWei('36000'));
            expect(await this.distribution.earned(wallet1)).to.be.bignumber.almostEqualDiv1e18(web3.utils.toWei('36000'));
            expect(await this.distribution.earned(wallet2)).to.be.bignumber.almostEqualDiv1e18(web3.utils.toWei('36000'));
        });

        it('Two stakers with the different (1:3) stakes wait 1 w', async function () {
            // 72000 reward tokens per week
            await this.distribution.notifyRewardAmount(web3.utils.toWei('72000'), { from: wallet1 });

            expect(await this.distribution.rewardPerToken()).to.be.bignumber.almostEqualDiv1e18('0');
            expect(await this.distribution.balanceOf(wallet1)).to.be.bignumber.equal('0');
            expect(await this.distribution.balanceOf(wallet2)).to.be.bignumber.equal('0');
            expect(await this.distribution.earned(wallet1)).to.be.bignumber.equal('0');
            expect(await this.distribution.earned(wallet2)).to.be.bignumber.equal('0');

            await this.distribution.stake(web3.utils.toWei('1'), { from: wallet1 });
            await this.distribution.stake(web3.utils.toWei('3'), { from: wallet2 });

            expect(await this.distribution.rewardPerToken()).to.be.bignumber.almostEqualDiv1e18('0');
            expect(await this.distribution.earned(wallet1)).to.be.bignumber.equal('0');
            expect(await this.distribution.earned(wallet2)).to.be.bignumber.equal('0');

            await timeJumpTo(this.started.add(time.duration.weeks(1)));

            expect(await this.distribution.rewardPerToken()).to.be.bignumber.almostEqualDiv1e18(web3.utils.toWei('18000'));
            expect(await this.distribution.earned(wallet1)).to.be.bignumber.almostEqualDiv1e18(web3.utils.toWei('18000'));
            expect(await this.distribution.earned(wallet2)).to.be.bignumber.almostEqualDiv1e18(web3.utils.toWei('54000'));
        });

        it('Two stakers with the different (1:3) stakes wait 2 weeks', async function () {
            //
            // 1x: +----------------+ = 72k for 1w + 18k for 2w
            // 3x:         +--------+ =  0k for 1w + 54k for 2w
            //

            // 72000 reward tokens per week
            await this.distribution.notifyRewardAmount(web3.utils.toWei('72000'), { from: wallet1 });

            await this.distribution.stake(web3.utils.toWei('1'), { from: wallet1 });

            await timeJumpTo(this.started.add(time.duration.weeks(1)));

            await this.distribution.stake(web3.utils.toWei('3'), { from: wallet2 });

            expect(await this.distribution.rewardPerToken()).to.be.bignumber.almostEqualDiv1e18(web3.utils.toWei('72000'));
            expect(await this.distribution.earned(wallet1)).to.be.bignumber.almostEqualDiv1e18(web3.utils.toWei('72000'));
            expect(await this.distribution.earned(wallet2)).to.be.bignumber.almostEqualDiv1e18(web3.utils.toWei('0'));

            // Forward to week 3 and notifyReward weekly
            for (let i = 1; i < 3; i++) {
                await timeJumpTo(this.started.add(time.duration.weeks(i + 1)));
                await this.distribution.notifyRewardAmount(web3.utils.toWei('72000'), { from: wallet1 });
            }

            expect(await this.distribution.rewardPerToken()).to.be.bignumber.almostEqualDiv1e18(web3.utils.toWei('90000'));
            expect(await this.distribution.earned(wallet1)).to.be.bignumber.almostEqualDiv1e18(web3.utils.toWei('90000'));
            expect(await this.distribution.earned(wallet2)).to.be.bignumber.almostEqualDiv1e18(web3.utils.toWei('54000'));
        });

        it('Three stakers with the different (1:3:5) stakes wait 3 weeks', async function () {
            //
            // 1x: +----------------+--------+ = 18k for 1w +  8k for 2w + 12k for 3w
            // 3x: +----------------+          = 54k for 1w + 24k for 2w +  0k for 3w
            // 5x:         +-----------------+ =  0k for 1w + 40k for 2w + 60k for 3w
            //

            // 72000 reward tokens per week for 3 weeks
            await this.distribution.notifyRewardAmount(web3.utils.toWei('72000'), { from: wallet1 });

            await this.distribution.stake(web3.utils.toWei('1'), { from: wallet1 });
            await this.distribution.stake(web3.utils.toWei('3'), { from: wallet2 });

            await timeJumpTo(this.started.add(time.duration.weeks(1)));

            await this.distribution.stake(web3.utils.toWei('5'), { from: wallet3 });

            expect(await this.distribution.rewardPerToken()).to.be.bignumber.almostEqualDiv1e18(web3.utils.toWei('18000'));
            expect(await this.distribution.earned(wallet1)).to.be.bignumber.almostEqualDiv1e18(web3.utils.toWei('18000'));
            expect(await this.distribution.earned(wallet2)).to.be.bignumber.almostEqualDiv1e18(web3.utils.toWei('54000'));

            await this.distribution.notifyRewardAmount(web3.utils.toWei('72000'), { from: wallet1 });
            await timeJumpTo(this.started.add(time.duration.weeks(2)));

            expect(await this.distribution.rewardPerToken()).to.be.bignumber.almostEqualDiv1e18(web3.utils.toWei('26000')); // 18k + 8k
            expect(await this.distribution.earned(wallet1)).to.be.bignumber.almostEqualDiv1e18(web3.utils.toWei('26000'));
            expect(await this.distribution.earned(wallet2)).to.be.bignumber.almostEqualDiv1e18(web3.utils.toWei('78000'));
            expect(await this.distribution.earned(wallet3)).to.be.bignumber.almostEqualDiv1e18(web3.utils.toWei('40000'));

            await this.distribution.exit({ from: wallet2 });

            await this.distribution.notifyRewardAmount(web3.utils.toWei('72000'), { from: wallet1 });
            await timeJumpTo(this.started.add(time.duration.weeks(3)));

            expect(await this.distribution.rewardPerToken()).to.be.bignumber.almostEqualDiv1e18(web3.utils.toWei('38000')); // 18k + 8k + 12k
            expect(await this.distribution.earned(wallet1)).to.be.bignumber.almostEqualDiv1e18(web3.utils.toWei('38000'));
            expect(await this.distribution.earned(wallet2)).to.be.bignumber.almostEqualDiv1e18(web3.utils.toWei('0'));
            expect(await this.distribution.earned(wallet3)).to.be.bignumber.almostEqualDiv1e18(web3.utils.toWei('100000'));
        });

        it('One staker on 2 durations with gap', async function () {
            // 72000 reward tokens per week for 1 weeks
            await this.distribution.notifyRewardAmount(web3.utils.toWei('72000'), { from: wallet1 });

            await this.distribution.stake(web3.utils.toWei('1'), { from: wallet1 });

            await timeJumpTo(this.started.add(time.duration.weeks(2)));

            expect(await this.distribution.rewardPerToken()).to.be.bignumber.almostEqualDiv1e18(web3.utils.toWei('72000'));
            expect(await this.distribution.earned(wallet1)).to.be.bignumber.almostEqualDiv1e18(web3.utils.toWei('72000'));

            // 72000 reward tokens per week for 1 weeks
            await this.distribution.notifyRewardAmount(web3.utils.toWei('72000'), { from: wallet1 });

            await timeJumpTo(this.started.add(time.duration.weeks(3)));

            expect(await this.distribution.rewardPerToken()).to.be.bignumber.almostEqualDiv1e18(web3.utils.toWei('144000'));
            expect(await this.distribution.earned(wallet1)).to.be.bignumber.almostEqualDiv1e18(web3.utils.toWei('144000'));
        });

        it('Notify Reward Amount from mocked distribution to 10,000', async function () {
            // 10000 reward tokens per week for 1 weeks
            await this.distribution.notifyRewardAmount(web3.utils.toWei('10000'), { from: wallet1 });

            expect(await this.distribution.rewardPerToken()).to.be.bignumber.almostEqualDiv1e18('0');
            expect(await this.distribution.balanceOf(wallet1)).to.be.bignumber.equal('0');
            expect(await this.distribution.balanceOf(wallet2)).to.be.bignumber.equal('0');
            expect(await this.distribution.earned(wallet1)).to.be.bignumber.equal('0');
            expect(await this.distribution.earned(wallet2)).to.be.bignumber.equal('0');

            await this.distribution.stake(web3.utils.toWei('1'), { from: wallet1 });
            await this.distribution.stake(web3.utils.toWei('3'), { from: wallet2 });

            expect(await this.distribution.rewardPerToken()).to.be.bignumber.almostEqualDiv1e18('0');
            expect(await this.distribution.earned(wallet1)).to.be.bignumber.equal('0');
            expect(await this.distribution.earned(wallet2)).to.be.bignumber.equal('0');

            await timeJumpTo(this.started.add(time.duration.weeks(1)));

            expect(await this.distribution.rewardPerToken()).to.be.bignumber.almostEqualDiv1e18(web3.utils.toWei('2500'));
            expect(await this.distribution.earned(wallet1)).to.be.bignumber.almostEqualDiv1e18(web3.utils.toWei('2500'));
            expect(await this.distribution.earned(wallet2)).to.be.bignumber.almostEqualDiv1e18(web3.utils.toWei('7500'));
        });

        it('Claim reward after 1w', async function () {
            // 72000 reward tokens per week
            await this.distribution.notifyRewardAmount(web3.utils.toWei('72000'), {from: wallet1});

            await this.distribution.stake(web3.utils.toWei('1'), { from: wallet1 });
            await this.distribution.stake(web3.utils.toWei('1'), { from: wallet2 });

            await timeJumpTo(this.started.add(time.duration.weeks(1)));

            expect(await this.rewardToken.balanceOf(wallet2)).to.be.bignumber.equal('0');
            expect(await this.lpToken.balanceOf(wallet2)).to.be.bignumber.equal(web3.utils.toWei('999'));
            expect(await this.distribution.balanceOf(wallet2)).to.be.bignumber.equal(web3.utils.toWei('1'));
            expect(await this.distribution.earned(wallet1)).to.be.bignumber.almostEqualDiv1e18(web3.utils.toWei('36000'));

            await this.distribution.exit({ from: wallet2 });

            expect(await this.lpToken.balanceOf(wallet2)).to.be.bignumber.equal(web3.utils.toWei('1000'));
            expect(await this.distribution.balanceOf(wallet2)).to.be.bignumber.equal('0');
            expect(await this.rewardToken.balanceOf(wallet2)).to.be.bignumber.almostEqualDiv1e18(web3.utils.toWei('36000'));
        });

        it('Notify reward after 6 d', async function () {
            // 72000 reward tokens per week
            await this.distribution.notifyRewardAmount(web3.utils.toWei('72000'), {from: wallet1});

            await this.distribution.stake(web3.utils.toWei('1'), { from: wallet1 });
            await this.distribution.stake(web3.utils.toWei('1'), { from: wallet2 });

            await timeJumpTo(this.started.add(time.duration.days(6)));

            await this.distribution.notifyRewardAmount(web3.utils.toWei('72000'), {from: wallet1});

            const expectedRewardRate = new BN(web3.utils.toWei('72000')).mul(new BN('8')).div(new BN('7')).div(new BN(web3.utils.toWei('2')));

            expect(await this.distribution.rewardRate()).to.be.bignumber.almostEqualDiv1e18(expectedRewardRate);
        });

        it('Distribute additional rewards', async function () {
            const arToken = await AdditionalRewardToken.new();
            await arToken.mint(this.distribution.address, web3.utils.toWei('1000'));

            expect(await arToken.balanceOf(wallet2)).to.be.bignumber.equal('0');

            await this.distribution.distributeAdditionalRewards(arToken.address, [wallet2], [web3.utils.toWei('1000')], { from: wallet1 });

            expect(await arToken.balanceOf(wallet2)).to.be.bignumber.equal(web3.utils.toWei('1000'));
        });
    });
});
