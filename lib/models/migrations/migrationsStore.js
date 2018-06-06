'use strict';

const appData = require('../appData');
const _ = require('lodash');

const DOCUMENT_ID = 'migrations';


class MigrationsStore {

    save (set, done) {
        appData.updateDocument(DOCUMENT_ID, _.pick(set, ['lastRun', 'migrations']), true)
            .then((state) => { done(null, state); }, done);
    }

    load (done) {
        appData.getDocument(DOCUMENT_ID)
            .then((state) => {
                done(null, state || {
                    lastRun: null,
                    migrations: []
                });
            }, done);
    }
}

module.exports = MigrationsStore;
