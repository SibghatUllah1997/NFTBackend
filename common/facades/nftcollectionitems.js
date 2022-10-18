const isEmpty = require('lodash/isEmpty');

module.exports = class NftCollectionItemsFacade {
  constructor(Model) {
    this._model = Model;
    this._web3 = {};
    //always lowercase
    this._collection2abi = {
      '0x047e4287bd7d922f3eea8473fd9adc39fe8aab45': require('../abi/gladiatorCollectibles.json')
    }

  }

  setGlobalWeb3(chainId, web3) {
    this._web3[chainId] = web3;
  }

  async fetchToken(chainId, collectionsId, tokenId, options) {
    collectionsId = collectionsId.toLowerCase();
    let data = await this._model.findOne({
      where: {
        collectionsId,
        tokenId
      },
    });
    if(isEmpty(data)) {
      const web3 = this._web3[chainId];
      const contract = new web3.eth.Contract(this.getAbiFromCollection(collectionsId), collectionsId);
      // TODO: what if we have a different method? add it to some sort of mapping as well
      const fromBSC = await contract.methods.getGladiatorCollectibleId(tokenId).call();
      if(!isEmpty(fromBSC)) {
        data = await this._model.findOne({
          where: {
            collectionsId,
            tokenId: fromBSC
          },
        });
        data.tokenId = tokenId;
        data.id = null;
        return this._model.patchOrCreate(data);
      }

      throw Error('not');
    }
    return data;
  }

  getAbiFromCollection(collection)  {
    return this._collection2abi[collection.toLowerCase()];
  }
};
