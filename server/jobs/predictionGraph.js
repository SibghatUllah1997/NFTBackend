const app = require('../server');
const debug = require('debug')('api:PredictionGraphJob')

module.exports = class PredictionGraphJob {
  async run(chainId, contractId, contractOperator) {
    console.log("predictionGraph", chainId, contractId, contractOperator)
    const facade = app.models.bet;
    try {
      debug('Working on prediction graphs')
      await facade.predictionGraph(chainId, contractId, contractOperator);
      debug('Done Working on prediction graphs')
    } catch (ex) {
      debug(ex);
    }
  }
}
