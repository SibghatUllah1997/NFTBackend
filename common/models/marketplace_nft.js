
const MarketplaceFacade = require('../facades/marketplace');

module.exports = function(marketplace) {
  const facade = new MarketplaceFacade(marketplace);

  marketplace.marketplaceGraph = (...args) => facade.marketplaceGraph(...args);

  marketplace.setGlobalWeb3 = (...args) => facade.setGlobalWeb3(...args);

};
