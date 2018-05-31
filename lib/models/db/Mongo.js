'use strict';

const { MongoClient } = require('mongodb');


class Mongo {

    constructor () {
        this.db = null;
        this._url = null;
        this._options = null;
    }

    /**
     *
     * @param {string} url
     * @param {object} [options] Mongo configuration
     */
    async connect (url = '', options = {}) {

        if (this.db !== null) {
            return this.db;
        }

        try {

            this.db = await MongoClient.connect(url, options);

            process.stdout.write('Desks API connected into database. \n');

        } catch (error) {
            throw error;
        }

        return this.db;
    }

    /**
     * DANGER! WARNING! ONLY FOR TESTING
     * KEEP AWAY FROM LIVE!!! :))
     *
     * @returns {Promise}
     */
    clean () {

        return this.db.collections()
            .then((collections) => {

                const notSystemCollections = collections.filter(collection => (
                    collection.collectionName.indexOf('system.') !== 0
                ));

                // this is much faster than dropping all database
                return Promise.all(notSystemCollections.map(collection => collection.drop()));
            });
    }
}

module.exports = Mongo;
