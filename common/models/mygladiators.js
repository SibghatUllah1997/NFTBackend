
const MyGladiatorsFacade = require('../facades/mygladiators');

module.exports = function(mygladiators) {
  const facade = new MyGladiatorsFacade(mygladiators);

  mygladiators.setGlobalWeb3 = (...args) => facade.setGlobalWeb3(...args);

  mygladiators.fetchMultipleGladiatorsIds = (chainId, ids, options) =>
    facade.fetchMultipleGladiatorsIds(chainId, ids, options);
};
