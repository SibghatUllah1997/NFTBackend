
const NftCollectionItemsFacade = require('../facades/nftcollectionitems');

module.exports = function(nftCollectionitems) {
  const facade = new NftCollectionItemsFacade(nftCollectionitems);

  nftCollectionitems.setGlobalWeb3 = (...args) => facade.setGlobalWeb3(...args);

  nftCollectionitems.fetchToken = (chainId, collection, tokenId, options) =>
    facade.fetchToken(chainId, collection, tokenId, options);
};
