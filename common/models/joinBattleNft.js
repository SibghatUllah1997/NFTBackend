
const JoinBattleNftFacade = require('../facades/joinBattleNft');

module.exports = function(joinBattleNft) {
  const facade = new JoinBattleNftFacade(joinBattleNft);

  joinBattleNft.setGlobalWeb3 = (...args) => facade.setGlobalWeb3(...args);

  joinBattleNft.fetchBattjeJoinIds = (chainId, ids, options) =>
    facade.fetchBattjeJoinIds(chainId, ids, options);
};
