'use strict';

import _ from 'lodash';
import appData from '../appData';
const log = require('../log');

const DOCUMENT_ID = 'migrations';

type DoneCallback = (err: unknown|null, state?: unknown) => void;

const safeMigrationMsg = 'safeMigration is true, we do not allow empty migrations to be saved. ' +
    'If this is new project, feel free to enable it';

function checkValidMigrations(objWithMigrations: { migrations: any; }) {
    if (
        !objWithMigrations ||
        _.isEmpty(objWithMigrations.migrations) ||
        !_.isArray(objWithMigrations.migrations)) {
        log.error(safeMigrationMsg);
        throw new Error(safeMigrationMsg);
    }
}

class MigrationsStore {
    safeMigration: boolean;

    constructor(safeMigration: boolean) {
        this.safeMigration = safeMigration;
    }

    save (set: Object, done: DoneCallback) {
        log.info('Migration SET', set)
        const objToUpdate: any = _.pick(set, ['lastRun', 'migrations']);
        if (this.safeMigration) {
            checkValidMigrations(objToUpdate);

            const numOfValidMigrations = objToUpdate.migrations
                .reduce((prev: number, cur: { timestamp: any; }) => cur.timestamp? prev + 1 : prev, 0);

            // If all migrations are renewed=without timestamp (beside the first one that is trying to be applied)
            // There can be something wrong
            if (objToUpdate.migrations.length >= 3 && numOfValidMigrations <= 1) {
                log.error(safeMigrationMsg);
                throw new Error(safeMigrationMsg);
            }
        }

        appData.updateDocument(DOCUMENT_ID, { $set: objToUpdate }, true)
            .then((state) => { done(null, state); })
            .catch(done);
    }

    load (done: DoneCallback) {
        appData.getDocument(DOCUMENT_ID)
            .then((state) => {
                if (this.safeMigration) {
                    checkValidMigrations(state);
                }

                done(null, state || {
                    lastRun: null,
                    migrations: []
                });
            })
            .catch(done);
    }
}

export default MigrationsStore;
