'use strict';

import _ from 'lodash';
import appData from '../appData';

const DOCUMENT_ID = 'migrations';

type DoneCallback = (err: unknown|null, state?: unknown) => void;

class MigrationsStore {

    save (set: Object, done: DoneCallback) {
        appData.updateDocument(DOCUMENT_ID, { $set: _.pick(set, ['lastRun', 'migrations']) }, true)
            .then((state) => { done(null, state); }, done);
    }

    load (done: DoneCallback) {
        appData.getDocument(DOCUMENT_ID)
            .then((state) => {
                done(null, state || {
                    lastRun: null,
                    migrations: []
                });
            }, done);
    }
}

export default MigrationsStore;
