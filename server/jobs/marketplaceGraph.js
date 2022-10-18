const app = require('../server');
const debug = require('debug')('api:MarketplaceGraphJob')

module.exports = class MarketplaceGraphJob {
  async run(chainId, contractId) {
    const facade = app.models.marketplace_nft;
    try {
      debug('Working on marketplace graphs')
      await facade.marketplaceGraph(chainId, contractId);
      debug('Done Working on marketplace graphs')
    } catch (ex) {
      debug(ex);
    }
  }
}
