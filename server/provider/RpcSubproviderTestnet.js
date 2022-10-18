const xhr = process.browser ? require('xhr') : require('request')
const inherits = require('util').inherits
const createPayload = require('web3-provider-engine/util/create-payload.js')
const Subprovider = require('web3-provider-engine/subproviders/subprovider.js')
const { ethErrors, serializeError } = require('eth-json-rpc-errors')

const sample = require('lodash/sample')

//https://docs.binance.org/smart-chain/developer/rpc.html
const nodes = [
    // "https://data-seed-prebsc-1-s1.binance.org:8545",
    "https://data-seed-prebsc-2-s1.binance.org:8545"
];
module.exports = RpcSource

inherits(RpcSource, Subprovider)

function RpcSource(opts) {
  const self = this
  self.rpcUrl = sample(nodes)
}

RpcSource.prototype.handleRequest = function(payload, next, end){
  const self = this
  const targetUrl = self.rpcUrl

  // overwrite id to conflict with other concurrent users
  const sanitizedPayload = sanitizePayload(payload)
  const newPayload = createPayload(sanitizedPayload)

  xhr({
    uri: targetUrl,
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(newPayload),
    rejectUnauthorized: false,
    timeout: 20000,
  }, function(err, res, body) {
    if (err) return end(serializeError(err))

    // check for error code
    switch (res.statusCode) {
      case 405:
        return end(ethErrors.rpc.methodNotFound())
      case 504: // Gateway timeout
        return (function(){
          self.rpcUrl = sample(nodes)
          let msg = `Gateway timeout. The request took too long to process. `
          msg += `This can happen when querying logs over too wide a block range.`
          const err = new Error(msg)
          return end(serializeError(err))
        })()
      case 429: // Too many requests (rate limiting)
        return (function(){
          self.rpcUrl = sample(nodes)
          const err = new Error(`Too Many Requests`)
          return end(serializeError(err))
        })()
      default:
        if (res.statusCode != 200) {
          self.rpcUrl = sample(nodes)
          const msg = 'Unknown Error: ' + res.body
          const err = new Error(msg)
          return end(serializeError(err))
        }
    }

    // parse response
    let data
    try {
      data = JSON.parse(body)
    } catch (err) {
      console.error(err.stack)
      self.rpcUrl = sample(nodes)
      return end(serializeError(err))
    }
    if (data.error) return end(data.error)

    end(null, data.result)
  })
}

// drops any non-standard params
function sanitizePayload (payload) {
  return {
    id: payload.id,
    jsonrpc: payload.jsonrpc,
    method: payload.method,
    params: payload.params,
  }
}