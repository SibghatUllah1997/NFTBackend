const isEmpty = require('lodash/isEmpty');
const difference = require('lodash/difference')
const axios = require('axios')

const mygladiatorsAbi = require('../abi/gladiatorsNft.json');
const mygladiatorsContract = '0xfe88f683c2cBdfDA7148762e9C1231730FF74503';
const IPFS_GATEWAY = 'https://ipfs.io/ipfs';

module.exports = class JoinBattleNftFacade {
  constructor(Model) {
    this._model = Model;
    this._web3 = {};
  }

  setGlobalWeb3(chainId, web3) {
    this._web3[chainId] = web3;
  }

  async fetchBattjeJoinIds(chainId, ids, options) {
    let data = await this._model.find({where: {tokenId: {inq: ids}}})
    // if(data.length != ids.length) {
    //   const web3 = this._web3[chainId];
    //   const contract = new web3.eth.Contract(mygladiatorsAbi, mygladiatorsContract);
    //   for (const id of ids) {
    //     for (const dataId of data) {
    //       if(dataId.tokenId != id) {
    //         // TODO: what if we have a different method? add it to some sort of mapping as well
    //         const fromBSC = await contract.methods.getGladiatorById(id).call();
    //         if(!isEmpty(fromBSC)) {
    //           const tokenURI = await contract.methods.tokenURI(fromBSC.gladiatorId).call();
    //           const {data: ipfsJson} = await axios.get(this.getTokenUrl(tokenURI))
    //           await this._model.patchOrCreate({
    //             tokenId: fromBSC.gladiatorId,
    //             ipfsJson
    //           });
    //         }
    //       }
    //     }
    //   }
    //   //recalculate and return
    //   data = await this._model.find({where: {tokenId: {inq: ids}}})
    // }
    return data;
  }

  // getTokenUrl (tokenUri) {
  //   if (tokenUri.startsWith('ipfs://')) {
  //     return `${IPFS_GATEWAY}/${tokenUri.slice(6)}`
  //   } else if (!tokenUri.startsWith('http')) {
  //     return `${IPFS_GATEWAY}/${tokenUri}`
  //   }
  
  //   return tokenUri
  // }
};
