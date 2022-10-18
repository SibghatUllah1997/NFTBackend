# NFT APIs

## APIs
* User Management API
* NFT Collections API

### Tech Stack
It uses [Loopback.io](https://loopback.io) to serve REST APIs.
MongoDB as database.

## Environment files

- **api/server/datasources.json** it is the datasources file it uses when server is up
- **api/server/datasources-prod.json** contains the connections for mongodb in testnet/productoin
- **api/server/datasources-dev.json** contains the connections for mongodb in localhost


## Run Localhost
Make sure you have copied the localhost datasource `cp api/server/datasources-prod.json api/server/datasources.json`

To start it's as simple as:
```
npm run start
> api@1.0.0 start /Users/user/Documents/Gladiators.finance/api
> node .

The model "AccessToken" configures "belongsTo User-like models" relation with target model "User". However, the model "User" is not attached to the application and therefore cannot be used by this relation. This typically happens when the application has a custom custom User subclass, but does not fix AccessToken relations to use this new model.
Learn more at http://ibm.biz/setup-loopback-auth
Web server listening at: http://localhost:3007
Browse your REST API at http://localhost:3007/explorer
```

## Explorer
You can use Loppback's explorer to trigger RESTFull requests directly to the api `http://localhost:3007/explorer`.
For now, we're enabling it in prod, but it will be removed `https://api.gladiators.finance/explorer`.

