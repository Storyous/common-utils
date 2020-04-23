'use strict';

const MongoQueue = require('./MongoQueue');

module.exports = async (collection, { ttl }) => {

    await collection.createIndexes([
        { key: { publishedAt: 1 }, expireAfterSeconds: null } // TODO TTL
        // TO CONSUME
    ]);

    return new MongoQueue(collection);
};
