'use strict';

const { before, after } = require('mocha');
require('./config');
const { mongoClient } = require('../lib');

let connectPromise;

const connectAndGetMongoClient = async () => {

    if (!connectPromise) {
        connectPromise = mongoClient.connect();
    }

    await connectPromise;

    return mongoClient;
};

before(() => connectAndGetMongoClient());

after(() => {
    // eslint-disable-next-line no-console
    console.log('Disconnecting from the database');
    mongoClient.close();
});

module.exports = connectAndGetMongoClient;
