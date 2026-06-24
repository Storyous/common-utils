'use strict';

const { Migration } = require('../../lib');
const getCollection = require('../../lib/getCollection').default;

module.exports = new Migration('empty testing migration', async () => {
    const collection = getCollection('exampleCollection');
    await collection.createIndex({ updated: 1 });
});
