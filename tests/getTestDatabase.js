'use strict';

const { after } = require('mocha');
const db = require('../lib/models/db');

let connectPromise;

after(() => {
    if (db.client) {
        console.log('Disconnecting from the database');
        db.client.close();
    }
});

module.exports = async () => {

    if (!connectPromise) {
        connectPromise = db.connect('mongodb://127.0.0.1:27018/common-utils-testing');
    }

    await connectPromise;

    return db;
};
