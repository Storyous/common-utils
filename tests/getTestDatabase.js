'use strict';

const db = require('../lib/models/db');
const { after } = require('mocha');

let connectPromise;

after(() => {
    if (db.db) {
        console.log('Disconnecting from the database');
        db.db.close();
    }
});

module.exports = async () => {

    if (!connectPromise) {
        connectPromise = db.connect('mongodb://127.0.0.1:27017/common-utils-testing');
    }

    await connectPromise;

    return db;
};
