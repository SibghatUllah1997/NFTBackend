const ProviderEngine = require("web3-provider-engine");
const FiltersSubprovider = require('web3-provider-engine/subproviders/filters');
const WalletSubprovider = require('web3-provider-engine/subproviders/wallet');
const RpcSubprovider = require('./RpcSubprovider');
// const RpcSubprovider = require('web3-provider-engine/subproviders/rpc');
const Wallet = require('ethereumjs-wallet').default;
const NonceSubprovider = require('web3-provider-engine/subproviders/nonce-tracker');
const PollingBlockTrackerNoError = require('./PollingBlockTrackerNoError');

function PrivateKeyProvider(privateKey, rpcProvider) {
  if (!privateKey || !rpcProvider) {
    throw new Error(`Private Key missing, non-empty string expected, got "${privateKey}"`);
  }

  if (privateKey.startsWith('0x')) {
    privateKey = privateKey.substr(2, privateKey.length);
  }

  this.wallet = new Wallet(new Buffer(privateKey, "hex"));
  this.address = "0x" + this.wallet.getAddress().toString("hex");

  this.engine = new ProviderEngine({
    blockTracker: new PollingBlockTrackerNoError({
      provider: this,
      pollingInterval: 4000,
      setSkipCacheFlag: true,
    })
  });

  this.engine.addProvider(new FiltersSubprovider());
  this.engine.addProvider(new NonceSubprovider());
  this.engine.addProvider(new WalletSubprovider(this.wallet, {}));
  this.engine.addProvider(rpcProvider);

  this.engine.start();
}

PrivateKeyProvider.prototype.sendAsync = function() {
  this.engine.sendAsync.apply(this.engine, arguments);
};

PrivateKeyProvider.prototype.send = function() {
  return this.engine.send.apply(this.engine, arguments);
};


module.exports = PrivateKeyProvider;
