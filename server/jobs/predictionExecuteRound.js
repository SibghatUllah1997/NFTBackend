const app = require('../server');
const debug = require('debug')('api:PredictionExecuteRoundJob')

module.exports = class PredictionExecuteRoundJob {
  async run(chainId, contractId, contractOperator) {
    console.log("PredictionExecuteRoundJob", chainId, contractId, contractOperator)
    const facade = app.models.bet;
    try {
      debug('Working on executing round')
      await facade.predictionExecuteRound(chainId, contractId, contractOperator);
      debug('Done Working on executing round')
    } catch (ex) {
      debug(ex);
    }
  }
}
