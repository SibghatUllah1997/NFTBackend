const debug = require('debug')('api:Prediction:Facade')
const PredictionContractABI = require("../abi/predictionAbi.json");
const { BigNumber } = require('@ethersproject/bignumber')
const sortBy = require('lodash/sortBy')
const set = require('lodash/set')

const EIGHT_BD = 1e8;
const EIGHTEEN_BD = 1e18;

const BUFFER_SECONDS = 24*60*60; // 1 day

module.exports = class PredictionFacade {
    constructor(Model) {
        this._model = Model;
        this._web3 = {};
        this._model.getApp(() => {
            const loopback = require('loopback');
            this._notyourbusiness = loopback.getModel('notyourbusiness');
            this._bet = loopback.getModel('bet');
            this._market = loopback.getModel('market');
            this._round = loopback.getModel('round');
            this._user = loopback.getModel('user');
        });
    }

    setGlobalWeb3(chainId, web3) {
        this._web3[chainId] = web3;
    }
    
    async getTotalWon(position) {
        const market = await this.getMarket();
        const rounds = await this._round.find(
            { where: { position } }
        );

        return {
            market: {
                totalBNB: market.totalBNB,
                totalBNBTreasury: market.totalBNBTreasury
            },
            rounds: {
                totalAmount: rounds.reduce((last, r) => r.totalAmount + last, 0)
            }
        }
    }

    async predictionExecuteRound(chainId, contractId, contractOperator) {
        const market = await this.getMarket();
        try {
            // console.log("marketmarketmarket", market)
            if (market.paused || !market.epoch) {
                return debug('Market is paused, skipping');
            }

            const eventRound = set({}, 'returnValues.epoch', market.epoch);
            console.log("eventRound", eventRound)
            const round = await this.getRound(eventRound);
            // if (round.failed) { // shouldn't happen
            //     return debug('Market is unstable, waiting for events to continue...')
            //     //throw new Error('Current Round failed, needs to pause the market');
            // }

            set(eventRound, 'returnValues.epoch', round.previous);
            const previousRound = await this.getRound(eventRound);
            // console.log("previousRoundpreviousRoundpreviousRoundpreviousRound", previousRound)
            const timestamp = await this.retry(() => this.getTimestampLastBlock(chainId));
            console.log("rounddddddddddd", round)
            console.log("timestamp", timestamp)
            // console.log("BUFFER_SECONDS", BUFFER_SECONDS)
            // if (timestamp > round.closeTimestamp + BUFFER_SECONDS) {
            //     throw new Error(`Gotta pause the market, round past due [${timestamp} / ${round.closeTimestamp} / ${round.closeTimestamp + BUFFER_SECONDS}]`)
            // }

            console.log(" timestamp >= (round.startTimestamp + BUFFER_SECONDS", !round.sent && timestamp >= (round.startTimestamp + BUFFER_SECONDS))
            if (!round.sent && timestamp >= (round.startTimestamp||0 + BUFFER_SECONDS)) {
                // require(rounds[epoch].startBlock != 0, "Can only lock round after round has started");
                // require(block.number >= rounds[epoch].lockBlock, "Can only lock round after lockBlock");
                // require(block.number <= rounds[epoch].lockBlock.add(bufferBlocks), "Can only lock round within bufferBlocks");
                
                //dont execute, just call (wont send to blockchain)
                //test before spending gas, if fails needs to alert someone
                await this.executeRound(chainId, false); 
                await this.executeRound(chainId, true);

                round.sent = true;
                await this._round.patchOrCreate(round);
                // return debug('Not ready to execute round')
                return true;
            }
            
            // return debug('Not ready to execute round')
            debug('Not ready to execute round')
            return false;
        } catch (error) {
            debug(error)
            //lets retry (might be a network issue)
            this.retry(() => this.predictionExecuteRound(chainId))
            .catch(async error => {
                //if failed, let's stop the market
                const prediction = new this._web3[chainId].eth.Contract(PredictionContractABI, contractId);
                const estimatedGas = await prediction.methods.pause().estimateGas({ from: contractOperator });
                await prediction.methods.pause().send({
                    from: contractOperator,
                    gasLimit: this.calculateGasMargin(estimatedGas),
                })
                    .finally(() => {
                        market.paused = true;
                        return this._market.patchOrCreate(market);
                    });
            });
        }
    }

    async getTimestampLastBlock(chainId) {
        const lastBlockNumber = await this._web3[chainId].eth.getBlockNumber();
        if (!lastBlockNumber) throw Error();
        const lastBlock = await this._web3[chainId].eth.getBlock(lastBlockNumber);
        if (!lastBlock || !lastBlock.timestamp) throw Error();
        return lastBlock.timestamp;
    }

    async executeRound(chainId, executeOnBlockchain) {
        const prediction = new this._web3[chainId].eth.Contract(PredictionContractABI, contractId);

        const estimatedGas = await prediction.methods.startNextRound().estimateGas({ from: contractOperator });
        debug('Testing ExecuteRound (NOT SENDING TO BLOCKCHAIN')
        await prediction.methods.startNextRound().call({
            from: contractOperator,
            gasLimit: this.calculateGasMargin(estimatedGas),
        }).catch(ex => {
            console.error(ex);
            // if(ex.code == -32000) {
            process.exit(-1);
            // }
        });
        if (executeOnBlockchain) {
            debug('Sending to blockchain')
            await prediction.methods.startNextRound().send({
                from: contractOperator,
                gasLimit: this.calculateGasMargin(estimatedGas),
            }).catch(ex => {
                console.error(ex);
                // if(ex.code == -32000) {
                process.exit(-1);
                // }
            });
        }

        return true;
    }

    async predictionGraph(chainId, contractId, contractOperator) {
        const prediction = new this._web3[chainId].eth.Contract(PredictionContractABI, contractId);
        let lastCheck = await this._notyourbusiness.findOne(
            { where: { which: 'prediction_events' } }
        );
        if (!lastCheck) {
            lastCheck = { chain:chainId, which: 'prediction_events', content: 19583531 };
        }
        const fromBlock = (lastCheck.content * 1);
        const lastBlock = await this._web3[chainId].eth.getBlockNumber();
        const toBlock = Math.min(fromBlock + 4000, lastBlock);

        debug(`Processing events from [${fromBlock}] to [${toBlock}]`);

        // TODO: update ABI otherwise it fails 
        const allEvents = await this.getPastEvents(prediction, "allEvents", fromBlock, toBlock);
        const events = sortBy(allEvents,
            ['blockNumber', 'logIndex']
        );

        debug('Events are: ', events)
        if (events && events.length > 0) {
            const market = await this.getMarket();
            for (let event of events) {
                if (!this[`handle${event.event}`]) continue
                await this[`handle${event.event}`](market, event, prediction);
                await this._market.patchOrCreate(market);
            }
        }

        lastCheck.content = toBlock;
        return this._notyourbusiness.patchOrCreate(lastCheck)
    }

    async handleStartRound(market, round, prediction) {
        const eventRound = await this.getRound(round);

        const fromBSC = await this.retry(() => this.getRoundFromBSC(prediction, eventRound));
        eventRound.startTimestamp = fromBSC.startTimestamp;
        eventRound.closeTimestamp = fromBSC.closeTimestamp;

        debug('handleStartRound ', eventRound);
        await this._round.patchOrCreate(eventRound);

        market.epoch = eventRound.id;
        market.paused = false;
    }
    
    async handleEndRound(market, round, prediction) {
        const eventRound = await this.getRound(round);

        const fromBSC = await this.retry(() => this.getRoundFromBSC(prediction, eventRound));
        eventRound.closeTimestamp = fromBSC.timestamp;
        eventRound.endHash = fromBSC.transactionHash;

        // Get round result based on lock/close price.
        if (eventRound.attackerWins) {
            eventRound.position = "BetAttacker";
        } else if (eventRound.defenderWins) {
            eventRound.position = "BetDefender";
        } else {
            eventRound.position = "House";
        }
        eventRound.failed = false;
        debug('handleEndRound ', eventRound)
        await this._round.patchOrCreate(eventRound);
    }

    async handleBetAttacker(market, event) {
        const amount = (event.returnValues.amount * 1 / EIGHTEEN_BD);
        market.totalBets = market.totalBets + 1;
        market.totalBetsBull = market.totalBetsBull + 1;
        market.totalBNB = market.totalBNB + amount;
        market.totalBNBBull = market.totalBNBBull + amount;

        const round = await this.getRound(event);

        round.totalBets = round.totalBets + 1;
        round.totalAmount = round.totalAmount + amount;
        round.bullBets = round.bullBets + 1;
        round.bullAmount = round.bullAmount + amount;

        debug('handleBetAttacker.round', round)
        await this._round.patchOrCreate(round);

        const address = event.returnValues.sender.toString().toLowerCase();
        const user = await this.getUser(market, address);
        user.totalBets = user.totalBets > 0 ? user.totalBets + 1 : 1;
        user.totalBNB = user.totalBNB > 0 ? user.totalBNB + amount : amount;
        debug('handleBetAttacker.user', user)
        await this._user.patchOrCreate(user);

        const bet = {
            roundId: round.id,
            userId: user.id,
            hash: event.transactionHash,
            amount,
            position: "betAttacker",
            claimed: false,
            block: event.blockNumber
        }
        debug('handleBetAttacker.bet', bet)
        let isBetExist = await this._bet.findOne(
            { where: { userId: user.id, roundId: round.id, hash: event.transactionHash } }
        );
        if(!isBetExist){
            await this._bet.patchOrCreate(bet);
        }
    }

    async handleBetDefender(market, event) {
        const amount = (event.returnValues.amount * 1 / EIGHTEEN_BD);
        market.totalBets = market.totalBets + 1;
        market.totalBetsBear = market.totalBetsBear + 1;
        market.totalBNB = market.totalBNB + amount;
        market.totalBNBBear = market.totalBNBBBear + amount;

        const round = await this.getRound(event);

        round.totalBets = round.totalBets + 1;
        round.totalAmount = round.totalAmount + amount;
        round.bearBets = round.bearBets + 1;
        round.bearAmount = round.bearAmount + amount;
        debug('handleBetDefender.round ', round)
        await this._round.patchOrCreate(round);

        const address = event.returnValues.sender.toString().toLowerCase();
        const user = await this.getUser(market, address);
        user.totalBets = user.totalBets > 0 ? user.totalBets + 1 : 1;
        user.totalBNB = user.totalBNB > 0 ? user.totalBNB + amount : amount;
        debug('handleBetDefender.user ', user)
        await this._user.patchOrCreate(user);

        const bet = {
            roundId: event.returnValues.epoch,
            userId: user.id,
            hash: event.transactionHash,
            amount,
            position: "betDefender",
            claimed: false,
            block: event.blockNumber
        }
        debug('handleBetDefender.bet ', bet)
        let isBetExist = await this._bet.findOne(
            { where: { userId: user.id, roundId: round.id, hash: event.transactionHash } }
        );
        if(!isBetExist){
            await this._bet.patchOrCreate(bet);
        }
    }

    async handleClaim(market, event) {
        const user = await this.getUser(market, event.returnValues.sender.toString().toLowerCase());
        let bet = await this._bet.findOne(
            { where: { userId: user.id, roundId: event.returnValues.epoch } }
        );
        if (bet) {
            bet.claimed = true;
            bet.claimedAmount = event.returnValues.amount * 1 / EIGHTEEN_BD;
            bet.claimedHash = event.transactionHash;
            bet.updatedAt = event.returnValues.timestamp;
            debug('handleClaim.bet ', bet)
            await this._bet.patchOrCreate(bet);
        }
    }

    async handlePause(market, event) {
        const eventRound = await this.getRound(event);
        eventRound.failed = true;
        debug('handlePause.eventRound ', eventRound)
        await this._round.patchOrCreate(eventRound);

        // Also fail the previous round because it will not complete.
        const previousRound = await this._round.findOne(
            { where: { id: eventRound.previous } }
        );
        if (previousRound !== null) {
            previousRound.failed = true;
            debug('handlePause.previousRound ', previousRound)
            await this._round.patchOrCreate(previousRound);
        }

        market.epoch = eventRound.id;
        market.paused = true;
    }

    async handleUnpause(market, event) {
        market.epoch = event.returnValues.epoch;
        market.paused = false;
    }

    async handleRatesUpdated(market, event) {
        market.rewardRate = event.returnValues.rewardRate;
        market.treasuryRate = event.returnValues.treasuryRate;
    }

    async handleRewardsCalculated(market, round) {
        const eventRound = await this.getRound(round);
        round.totalAmountTreasury = market.totalBNBTreasury + (round.returnValues.treasuryAmount * 1 / EIGHTEEN_BD);
        debug('handleRewardsCalculated ', eventRound)
        await this._round.patchOrCreate(eventRound);

        market.totalBNBTreasury = market.totalBNBTreasury + (round.returnValues.treasuryAmount * 1 / EIGHTEEN_BD);
    }

    async getPastEvents(contract, eventName, fromBlock, toBlock) {
        if (fromBlock <= toBlock) {
            try {
                const result = await contract.getPastEvents(eventName, { fromBlock, toBlock });
                return result;
            } catch (error) {
                const midBlock = (fromBlock + toBlock) >> 1;
                const arr1 = await this.getPastEvents(contract, eventName, fromBlock, midBlock);
                const arr2 = await this.getPastEvents(contract, eventName, midBlock + 1, toBlock);
                return [...arr1, ...arr2];
            }
        }
        return [];
    }

    async getMarket(epoch) {
        let market = await this._market.findOne(
            { where: { id: '1' } }
        );
        if (!market) {
            market = {
                id: '1',
                epoch,
                paused: false,
                totalUsers: 0,
                totalBets: 0,
                totalBetsBull: 0,
                totalBetsBear: 0,
                totalBNB: 0,
                totalBNBBull: 0,
                totalBNBBear: 0,
                totalBNBTreasury: 0,
                rewardRate: 0,
                treasuryRate: 0
            }
        }
        return market;
    }

    async getRound(paramRound) {
        const epoch = paramRound.returnValues.epoch || paramRound.returnValues.currentEpoch;
        let round = await this._round.findOne(
            { where: { id: epoch } }
        );
        if (!round) {
            round = {
                id: epoch,
                previous: epoch === '1' ? null : ((epoch * 1) - 1).toString(),
                startTimestamp: paramRound.timestamp,
                startHash: paramRound.transactionHash,
                totalBets: 0,
                totalAmount: 0,
                bullBets: 0,
                bullAmount: 0,
                bearBets: 0,
                bearAmount: 0
            }
        }
        return round;
    }

    async getUser(market, address) {
        let user = await this._user.findOne(
            { where: { address } }
        );
        if (!user) {
            user = {
                address,
                username: address,
                signature: 'nope',
                password: address,
                email: `${address}@nomatter.com`
            }
            market.totalUsers = market.totalUsers + 1;
        }
        return user;
    }

    async getRoundFromBSC(prediction, eventRound){
        const fromBSC = await prediction.methods.rounds(eventRound.id).call();
        if(!fromBSC || !fromBSC.closeTimestamp) {
            throw new Error('just retry');
        }
        return fromBSC;
    }


    // add 10%
    calculateGasMargin(value) {
        return BigNumber.from(value).mul(BigNumber.from(10000).add(BigNumber.from(1000))).div(BigNumber.from(10000))
    }

    async retry(fn, retriesLeft = 6, interval = 1200, exponential = false) {
        try {
            const val = await fn();
            return val;
        } catch (error) {
            if (retriesLeft) {
                await new Promise(r => setTimeout(r, interval));
                return this.retry(
                    fn,
                    retriesLeft - 1,
                    exponential ? interval * 2 : interval, exponential
                );
            } else throw new Error('Max retries reached');
        }
    }
}
