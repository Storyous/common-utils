'use strict';

const { MongoClient } = require('mongodb');


class Mongo {

    constructor () {
        this.db = null;
        this.client = null;
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

        const _options = {
            useUnifiedTopology: true,
            ...options
        };

        this.client = await MongoClient.connect(url, _options);

        this.db = this.client.db();

        process.stdout.write('Connected into database. \n');

        return this.db;
    }

}

module.exports = Mongo;
