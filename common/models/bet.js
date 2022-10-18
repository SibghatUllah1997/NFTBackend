'use strict';
const PredictionFacade = require('../facades/prediction');

module.exports = function(prediction) {
    const facade = new PredictionFacade(prediction);

    prediction.getTotalWon = (...args) => facade.getTotalWon(...args);

    prediction.predictionGraph = (...args) => facade.predictionGraph(...args);

    prediction.predictionExecuteRound = (...args) => facade.predictionExecuteRound(...args);

    prediction.setGlobalWeb3 = (...args) => facade.setGlobalWeb3(...args);
};
