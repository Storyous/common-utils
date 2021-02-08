# Common JS utils

## Migration guide

### 4.4.2

Prometheus middleware `getHttpRequestMetricsMiddleware` is now deprecated, you should remove it, same metrics can be aggregated from `getRequestDurationMetricsMiddleware` alone 

### 5.2.0

Added loggly adapter. To use loggly you have to set `silent:false` and loggly token via `LOGGLY_TOKEN` env or directly in the config.

### 7.1.0

- Added default timeouts for getMongoCachedJSONFetcher (2000ms for fetch execution, 20000ms for background request)
- parallel call of the fetcher will not cause parallel requests to database nor the URL 

### 8.0

logger.module returns pure Winston child instance, rename logger calls:
    log.e -> log.error
    log.w -> log.warn
    log.i -> log.info
    
### 9.0

getMongoCacheFetcher is now async
mongoCachedFetcher 
    - supports remote ETag
    - expose ifNoneMatch
    - returns result object instead of direct file content

### 10.0

concurrentTask accepts options object as the second parameter allowing configure: noLaterThan, startAttemptsDelay

### 11.0

apiTestUtil becomes testUtils. New usage:

#### `config/testing.config.json`
```javascript
const testUtils = require('@storyous/common-utils/src/testUtils');

module.exports = {
   mongodbUrl: testUtils.uniqueDatabase(process.env.MONGODB_URI) // this will generate timestamp-postfixed database name 
        || 'mongodb://127.0.0.1:27018/myProjectTesting',
   // ...the rest of the config
};
```

#### `test/api.js`
```javascript
const testUtils = require('@storyous/common-utils/src/testUtils');
const mocha = require('mocha');
const app = require('../app'); // this has to be a function providing Koa function

testUtils.init({ app, mocha });

module.exports = testUtils;
```

### 12.0

- Added `mongoClient` module (expects `mongodbUrl` property in config). Preconfigured native mongodb driver's client.
- Added collection getter returning native mongodb driver's collection. Usage: `collection('myOrders')`.
- Removed `db` module - use `collection` & `mongoClient` instead.
    - `collection` changed to `getCollection` in version 14


### 13.0

Error handler is direct function. Usage:

```javascript
const { errorHandler } = require('@storyous/common-utils');

// ...

app.use(errorHandler);
```

### 14.0

```javascript
collection('collectionName')
```
changed to
```javascript
getCollection('collectionName')
``` 

### 15.0

To have human-readable logs and errors, add

```javascript
    logging: {
        console: {
            prettyOutput: true,
        },
    },
```

to `development.config.js`

Do NOT use anywhere else


### 15.3
Default ```mongoLocker()``` function introduced. Use a prefix for the key when you want to use it in multiple places in the app. Example:

```javascript
// tokenStorage.js
await mongoLocker('token-renewal-process', async () => {
    // some async stuff
    // ...
    return 'myToken';
});

// payments.js - completely idempendent part of application
const transactionResult = await mongoLocker(`payment-transaction-${merchantId}`, async () => {
    // some async stuff
    // ...
    return true;
});
```
### 15.6.0
Loggly network errors does not cause exit of all app anymore

### 15.7.0
`mongoLocker` support 'expireIn' (millis) option which can be used to customize default 2 minutes acquisition.
The mongoLocker now also handles expired document waiting to be deleted by a MongoDB background job.


## MongoCachedFetcher

### Usage:  
```javascript
const collection = mongodb.collection('myCachedFiles');

const fetcher = await getMongoCachedJSOFetcher(collection, /* optional */ {
    url: 'https://my.files.com/file1',
    cacheLifetime: 60 * 1000, // 60 seconds
    fetchOptions: { headers: { Authorization: 'myToken' } }, // options for remote fetch
    transform: async (content, key) => content, // allows decorate the fetched content just before its storage
    ensureIndexes: true, // it allow's more optimal cache manipulation
    logError: (err) => console.error(err)
});

/* optional parameters */
const parameters = {
    url: 'https://my.files.com/file2', // url of json content
    key: 'file2', // key, under which will be the content cached, url is used by default
    metaOnly: false, // boolean, if truthy the content is not returned, useful for finding cache freshness
    ifNoneMatch: 'someOldEtag', // saying, we want to get content only if the current etag is not equal to the value
};

const {
    content, // file content, null in case of etagMatch=true
    isCacheFresh, // boolean saying the content is not after its lifetime
    etag, // entity tag (version). If not null, it can be used in future fetcher calls as ifNoneMatch parameter
    etagMatch // boolean, truthy if isNoneMatch parameter provided and corresponds with latest cached etag value
} = await fetcher(parameters /* optional */ );
```

### etag & ifNoneMatch
MongoCachedFetcher automatically stores ```ETag``` of remote resource if it is present in response from remote source.
The stored etag is then used for consequent cache-refresh http call to optimise traffic - no data are transferred
when the data didn't change. This functionality assumes the remote source of JSON data supports ```If-None-Match``` request header
and ```ETag``` response header.

On top of that, the fetcher accepts optional ```ifNoneMatch``` parameter. If it is used, and its value matches currently stored (refreshed) etag value,
result object will not contain ```content``` and the ```etagMatch``` will be ```true```.
