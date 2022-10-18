const debug = require("debug")("api:Marketplace:Facade");
const MarketplaceContractABI = require("../abi/marketplaceabi.json");
const sortBy = require("lodash/sortBy");

module.exports = class MarketplaceFacade {
  constructor(Model) {
    this._model = Model;
    this._web3 = {};
    this._model.getApp(() => {
      const loopback = require("loopback");
      this._notyourbusiness = loopback.getModel("notyourbusiness");
      this._order = loopback.getModel("marketplace_order");
      this._trade = loopback.getModel("marketplace_trade");
      this._nft = loopback.getModel("marketplace_nft");
      this._user = loopback.getModel("user");
    });
  }

  setGlobalWeb3(chainId, web3) {
    this._web3[chainId] = web3;
  }

  async marketplaceGraph(chainId, MARKETPLACE_CONTRACT_ADDRESS) {
    const marketplace = new this._web3[chainId].eth.Contract(
      MarketplaceContractABI,
      MARKETPLACE_CONTRACT_ADDRESS
    );
    let lastCheck = await this._notyourbusiness.findOne({
      where: { which: "marketplace_events" },
    });
    if (!lastCheck) {
      lastCheck = {
        chain: chainId,
        which: "marketplace_events",
        content: 19636386,
      };
    }
    const fromBlock = lastCheck.content * 1;
    const lastBlock = await this._web3[chainId].eth.getBlockNumber();
    const toBlock = Math.min(fromBlock + 4000, lastBlock);

    debug(`Processing marketplace events from [${fromBlock}] to [${toBlock}]`);
    // TODO: update ABI otherwise it fails
    const allEvents = await this.getPastEvents(
      marketplace,
      "allEvents",
      fromBlock,
      toBlock
    );
    const events = sortBy(allEvents, ["blockNumber", "logIndex"]);

    debug("Market place Events are: ", events);
    if (events && events.length > 0) {
      for (let event of events) {
        if (!this[`handle${event.event}`]) continue;
        await this[`handle${event.event}`](event, marketplace);
      }
    }

    lastCheck.content = toBlock;
    return this._notyourbusiness.patchOrCreate(lastCheck);
  }

  async handleAskNew(event, marketplace) {
    const user = await this.getUser(event.returnValues.seller.toLowerCase());
    user.numberTokensListed =
      user.numberTokensListed > 0 ? user.numberTokensListed + 1 : 1;
    await this._user.patchOrCreate(user);
    debug("handleAskNew.user", user);

    const nft = await this.getNft(
      event.returnValues.tokenId,
      event.returnValues.originContract.toLowerCase()
    );
    nft.updatedAt = Date.now();
    nft.currentAskPrice = event.returnValues.askPrice;
    nft.currentSeller = event.returnValues.seller.toLowerCase();
    nft.case = event.returnValues.caseType;
    nft.isTradable = true;
    await this._nft.patchOrCreate(nft);
    debug("handleAskNew.nft ", nft);

    const order = { transaction_hash: event.transactionHash };
    order.block = event.blockNumber;
    order.timestamp = Date.now();
    order.nftAddress = event.returnValues.originContract.toLowerCase();
    order.nftId = event.returnValues.tokenId;
    order.orderType = "New";
    order.askPrice = event.returnValues.askPrice;
    order.seller = event.returnValues.seller.toLowerCase();
    order.case = event.returnValues.caseType;
    await this._order.patchOrCreate(order);
    debug("handleAskNew.order ", order);
  }

  async handleAskCancel(event, marketplace) {
    const user = await this.getUser(event.returnValues.seller.toLowerCase());
    user.numberTokensListed =
      user.numberTokensListed > 0 ? user.numberTokensListed - 1 : 1;
    await this._user.patchOrCreate(user);
    debug("handleAskCancel.user", user);

    const nft = await this.getNft(
      event.returnValues.tokenId,
      event.returnValues.originContract.toLowerCase()
    );
    nft.updatedAt = Date.now();
    nft.currentAskPrice = 0;
    nft.currentSeller = null;
    nft.isTradable = false;
    await this._nft.patchOrCreate(nft);
    debug("handleAskCancel.nft ", nft);

    const order = { transaction_hash: event.transactionHash };
    order.block = event.blockNumber;
    order.timestamp = Date.now();
    order.nftAddress = event.returnValues.originContract.toLowerCase();
    order.nftId = event.returnValues.tokenId;
    order.orderType = "Cancel";
    order.askPrice = 0;
    order.seller = event.returnValues.seller.toLowerCase();
    order.case = event.returnValues.caseType;
    await this._order.patchOrCreate(order);
    debug("handleAskCancel.order ", order);
  }

  async handleAskUpdate(event, marketplace) {
    const nft = await this.getNft(
      event.returnValues.tokenId,
      event.returnValues.originContract.toLowerCase()
    );
    nft.updatedAt = Date.now();
    nft.currentAskPrice = event.returnValues.askPrice;
    nft.case = event.returnValues.caseType;
    await this._nft.patchOrCreate(nft);
    debug("handleAskUpdate.nft ", nft);

    const order = { transaction_hash: event.transactionHash };
    order.block = event.blockNumber;
    order.timestamp = Date.now();
    order.nftAddress = event.returnValues.originContract.toLowerCase();
    order.nftId = event.returnValues.tokenId;
    order.orderType = "Modify";
    order.askPrice = event.returnValues.askPrice;
    order.seller = event.returnValues.seller.toLowerCase();
    order.case = event.returnValues.caseType;
    await this._order.patchOrCreate(order);
    debug("handleAskUpdate.order ", order);
  }

  async handleTrade(event, marketplace) {
    //1 - buyer
    const buyer = await this.getUser(event.returnValues.buyer.toLowerCase());
    buyer.numberTokensPurchased =
      buyer.numberTokensPurchased > 0 ? buyer.numberTokensPurchased + 1 : 1;
    if (event.returnValues.caseType == 1) {
      //dena
      buyer.totalVolumeInDENATokensPurchased =
        buyer.totalVolumeInDENATokensPurchased > 0
          ? buyer.totalVolumeInDENATokensPurchased + event.returnValues.askPrice
          : event.returnValues.askPrice;
    } else {
      buyer.totalVolumeInNRTTokensPurchased =
        buyer.totalVolumeInNRTTokensPurchased > 0
          ? buyer.totalVolumeInNRTTokensPurchased + event.returnValues.askPrice
          : event.returnValues.askPrice;
    }
    await this._user.patchOrCreate(buyer);
    debug("handleTrade.buyer", buyer);

    //2 - seller
    const seller = await this.getUser(event.returnValues.seller.toLowerCase());
    seller.numberTokensSold =
      seller.numberTokensSold > 0 ? seller.numberTokensSold + 1 : 1;
    seller.numberTokensListed =
      seller.numberTokensListed > 0 ? seller.numberTokensListed - 1 : 1;
    if (event.returnValues.caseType == 1) {
      //dena
      seller.totalVolumeInDENATokensSold =
        seller.totalVolumeInDENATokensSold > 0
          ? seller.totalVolumeInDENATokensSold + event.returnValues.netPrice
          : event.returnValues.netPrice;
    } else {
      seller.totalVolumeInNRTTokensSold =
        seller.totalVolumeInNRTTokensSold > 0
          ? seller.totalVolumeInNRTTokensSold + event.returnValues.netPrice
          : event.returnValues.netPrice;
    }
    await this._user.patchOrCreate(seller);
    debug("handleTrade.seller", seller);

    //3 - nft
    const nft = await this.getNft(
      event.returnValues.tokenId,
      event.returnValues.originContract.toLowerCase()
    );
    nft.updatedAt = Date.now;
    nft.latestTradedPrice = event.returnValues.askPrice;
    nft.totalTrades = nft.numberTokensSold > 0 ? nft.totalTrades + 1 : 1;
    nft.currentAskPrice = 0;
    nft.currentSeller = null;
    nft.isTradable = false;

    if (event.returnValues.caseType == 1) {
      //dena
      nft.latestTradedPriceType = "DENA";
      nft.tradeVolumeDENA =
        seller.tradeVolumeDENA > 0
          ? seller.tradeVolumeDENA + nft.latestTradedPrice
          : nft.latestTradedPrice;
    } else {
      nft.latestTradedPriceType = "NRT";
      nft.tradeVolumeNRT =
        seller.tradeVolumeNRT > 0
          ? seller.tradeVolumeNRT + nft.latestTradedPrice
          : nft.latestTradedPrice;
    }

    debug("handleTrade.nft ", nft);
    await this._nft.patchOrCreate(nft);

    const trade = { transaction_hash: event.transactionHash };
    trade.tokenName = nft.latestTradedPriceType;
    trade.block = event.blockNumber;
    trade.timestamp = Date.now();
    trade.nftAddress = event.returnValues.originContract.toLowerCase();
    trade.nftId = event.returnValues.tokenId;
    trade.askPrice = event.returnValues.askPrice;
    trade.netPrice = event.returnValues.netPrice;
    trade.buyer = event.returnValues.buyer.toLowerCase();
    trade.seller = event.returnValues.seller.toLowerCase();
    await this._trade.patchOrCreate(trade);
    debug("handleTrade.trade ", trade);

    const order = { transaction_hash: event.transactionHash };
    order.block = event.blockNumber;
    order.timestamp = Date.now();
    order.nftAddress = event.returnValues.originContract.toLowerCase();
    order.nftId = event.returnValues.tokenId;
    order.orderType = "Buy";
    order.askPrice = event.returnValues.askPrice;
    order.seller = event.returnValues.seller.toLowerCase();
    order.buyer = event.returnValues.buyer.toLowerCase();
    order.case = event.returnValues.caseType;
    await this._order.patchOrCreate(order);
    debug("handleAskUpdate.order ", order);
  }

  async getPastEvents(contract, eventName, fromBlock, toBlock) {
    if (fromBlock <= toBlock) {
      try {
        const result = await contract.getPastEvents(eventName, {
          fromBlock,
          toBlock,
        });
        return result;
      } catch (error) {
        const midBlock = (fromBlock + toBlock) >> 1;
        const arr1 = await this.getPastEvents(
          contract,
          eventName,
          fromBlock,
          midBlock
        );
        const arr2 = await this.getPastEvents(
          contract,
          eventName,
          midBlock + 1,
          toBlock
        );
        return [...arr1, ...arr2];
      }
    }
    return [];
  }

  async getNft(nftId, nftAddress) {
    let nft = await this._nft.findOne({ where: { nftId, nftAddress } });
    if (!nft) {
      nft = {
        nftId,
        nftAddress,
        metadataUrl: "",
        updatedAt: 0,
        currentAskPrice: 0,
        currentSeller: 0,
        latestTradedPriceInBNB: 0,
        tradeVolumeBNB: 0,
        totalTrades: 0,
        isTradable: false,
      };
    }
    return nft;
  }

  async getUser(address) {
    let user = await this._user.findOne({ where: { address } });
    if (!user) {
      user = {
        address,
        username: address,
        signature: "nope",
        password: address,
        email: `${address}@nomatter.com`,
        numberTokensListed: 0,
        numberTokensPurchased: 0,
        numberTokensSold: 0,
        totalVolumeInDENATokensPurchased: 0,
        totalVolumeInDENATokensSold: 0,
        totalVolumeInNRTTokensPurchased: 0,
        totalVolumeInNRTTokensSold: 0,
      };
    }
    return user;
  }
};
