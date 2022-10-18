// const Web3 = require('web3');
// const PrivateKeyProvider = require("../provider/PrivateKeyProvider");
// const RpcSubproviderTestnet = require("../provider/RpcSubproviderTestnet");
// const RpcSubprovider = require("../provider/RpcSubprovider");

// const PredictionGraphJob = require('../jobs/predictionGraph')
// const PredictionExecuteRound = require('../jobs/predictionExecuteRound')
// const MarketplaceGraph = require('../jobs/marketplaceGraph')
// const schedule = require("node-schedule")
// module.exports = async (app) => {
//   console.log("running job scheduler..");
//   const chainId = 97;
//   const testnet = await app.models.notyourbusiness.findOne(
//     { where: { which: 'op', chain: chainId } }
//   );
//   console.log("testnet", testnet)
//   if (!testnet) throw new Error('Not an operator for testnet!');

//   app.models.marketplace_nft.setGlobalWeb3(chainId, 
//     new Web3(new PrivateKeyProvider(testnet.content, new RpcSubproviderTestnet())));

//   app.models.bet.setGlobalWeb3(chainId, 
//     new Web3(new PrivateKeyProvider(testnet.content, new RpcSubproviderTestnet())));

//   app.models.tokens.setGlobalWeb3(chainId, 
//     new Web3(new PrivateKeyProvider(testnet.content, new RpcSubproviderTestnet())));

//   app.models.mygladiators.setGlobalWeb3(chainId, 
//     new Web3(new PrivateKeyProvider(testnet.content, new RpcSubproviderTestnet())));
  
//   app.models.joinBattleNft.setGlobalWeb3(chainId, 
//     new Web3(new PrivateKeyProvider(testnet.content, new RpcSubproviderTestnet())));
  
//   const predictionGraph = new PredictionGraphJob();
//   const predictionExecuteRound = new PredictionExecuteRound();
//   const marketplaceGraph = new MarketplaceGraph();

//   const PREDICTION_CONTRACT_ADDRESS = "0x061D6aC99C772060e11d80dA2cAB0d640E11b0cc";
//   const PREDICTION_OPERATOR_ADDRESS = "0x6a091301bCF7Baa9d18ebB5FF651D75f075Fa53f";
//   const MARKETPLACE_CONTRACT_ADDRESS = "0x5DC12a513d79494bdE6b2C976EbF2725Dc404BAf";
  
//   // //run every 30s
//   // schedule.scheduleJob('*/30 * * * * *', () => {
//   //   // predictionGraph.run(chainId, PREDICTION_CONTRACT_ADDRESS, PREDICTION_OPERATOR_ADDRESS);
//   // });

//   // //run every 20s
//   // schedule.scheduleJob('*/20 * * * * *', () => {
//   //   // predictionExecuteRound.run(chainId, PREDICTION_CONTRACT_ADDRESS, PREDICTION_OPERATOR_ADDRESS);
//   // });

//   // //run every 1min
//   // schedule.scheduleJob('* * * * *', () => {
//   //   // marketplaceGraph.run(chainId);
//   // });

//   // //run every 1min
//   // schedule.scheduleJob('* * * * *', () => {
//   //   // marketplaceGraph.run(chainId, MARKETPLACE_CONTRACT_ADDRESS);
//   // });

// }
