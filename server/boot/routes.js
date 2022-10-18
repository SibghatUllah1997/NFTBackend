const API_KEY = "zHVS3tMD43hnSkjhgEStryvuhinijHYYDRESREdyghjhoHTDRDfghjoi"
module.exports = function(app) {
    app.post('/api/add/user/account/address/:address/:key', async function(req, res) {
      const {address, key} = req.params
      // console.log("req.bodyreq.bodyreq.body", req.params)
      if(key !== API_KEY) return res.status(400).send("API Key is required to add Account Address")
      if(!address) return res.status(400).send("Account Address is required")
      if(address.length !== 42) return res.status(400).send("Account Address is not correct")
      const isAlreadyAddressIsAdded = await app.models.refferal.findOne({where: {accountAddress: address}})
      if(!isAlreadyAddressIsAdded){
        const data = await app.models.refferal.patchOrCreate({accountAddress: address})
        return res.status(200).send({message: "Address is added", data})
      }
      res.status(200).send({message: "Address is Added", data: isAlreadyAddressIsAdded})
    });
    app.get('/api/get/user/account/address/:id/:key', async function(req, res) {
      const {id, key} = req.params
      // console.log("req.bodyreq.bodyreq.body", req.params)
      if(key !== API_KEY) return res.status(400).send("API Key is required to Get Account Address")
      if(!id) return res.status(400).send("ID is required")
      const refferal = await app.models.refferal.findOne({where: {_id: id}})
      if(!refferal){
        return res.status(400).send({message: "Account is not registered"})
      }
      res.status(200).send(refferal)
    });

    app.get('/api/get/acchievement/nfts/:ids', async function(req, res) {
      const {ids} = req.params
      if(ids.length <=0) return res.send("send token IDs")
      const achievements = await app.models.achievements.find({where: {tokenId: {inq: JSON.parse(ids)}}})
      res.send(achievements);
    });
  }