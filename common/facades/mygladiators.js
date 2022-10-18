const isEmpty = require('lodash/isEmpty');
const sample = require('lodash/sample')
const axios = require('axios')

const mygladiatorsAbi = require('../abi/gladiatorsNft.json');
const mygladiatorsContract = '0xfe88f683c2cBdfDA7148762e9C1231730FF74503';
const IPFS_GATEWAYS = [
  'https://ipfs.io/ipfs',
  'https://gateway.pinata.cloud/ipfs'
];

module.exports = class MyGladiatorsFacade {
  constructor(Model) {
    this._model = Model;
    this._web3 = {};
  }

  setGlobalWeb3(chainId, web3) {
    this._web3[chainId] = web3;
  }

  async fetchMultipleGladiatorsIds(chainId, ids, options) {
    let data = await this._model.find({where: {tokenId: {inq: ids}}})
    if(data.length != ids.length) {
      const web3 = this._web3[chainId];
      const contract = new web3.eth.Contract(mygladiatorsAbi, mygladiatorsContract);
      for (const id of ids) {
        // TODO: what if we have a different method? add it to some sort of mapping as well
        const fromBSC = await contract.methods.getGladiatorById(id).call();
        if(!isEmpty(fromBSC)) {
          const tokenURI = await contract.methods.tokenURI(fromBSC.gladiatorId).call();
          const {data: ipfsJson} = await this.retry(() => axios.get(this.getTokenUrl(tokenURI)))
          await this._model.patchOrCreate({
            tokenId: fromBSC.gladiatorId,
            ipfsJson
          });
        }
      }
      //recalculate and return
      data = await this._model.find({where: {tokenId: {inq: ids}}})
    }
    return data;
  }

  getTokenUrl (tokenUri) {
    if (tokenUri.startsWith('ipfs://')) {
      return `${sample(IPFS_GATEWAYS)}/${tokenUri.slice(6)}`
    } else if (!tokenUri.startsWith('http')) {
      return `${sample(IPFS_GATEWAYS)}/${tokenUri}`
    }
  
    return tokenUri
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
};
