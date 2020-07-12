'use strict';

const { after } = require('mocha');
require('./config');
const mongoClient = require('../lib/mongoClient');

let connectPromise;

after(() => {
    console.log('Disconnecting from the database');
    mongoClient.close();
});

module.exports = async () => {

    if (!connectPromise) {
        connectPromise = mongoClient.connect();
    }

    await connectPromise;

    return mongoClient;
};
