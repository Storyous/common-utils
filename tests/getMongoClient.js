'use strict';

const { before, after } = require('mocha');
require('./config');
const mongoClient = require('../lib/mongoClient');

let connectPromise;

let connectAndGetMongoClient = async () => {

    if (!connectPromise) {
        connectPromise = mongoClient.connect();
    }

    await connectPromise;

    return mongoClient;
};

before(() => connectAndGetMongoClient());

after(() => {
    console.log('Disconnecting from the database');
    mongoClient.close();
});

module.exports = connectAndGetMongoClient;