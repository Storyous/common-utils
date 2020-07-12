'use strict';

const supertest = require('supertest');
const http = require('http');
const { MongoClient } = require('mongodb');
const _mocha = require('mocha');
const config = require('./config');

const testUtils = {

    _app: null,

    /**
     * @param {Function} [app]
     * @param {string} [cleanDatabaseUrl]
     * @param {Mocha} [mocha]
     */
    init ({ app, cleanDatabaseUrl = config.mongodbUrl, mocha = _mocha }) {
        mocha.before(async () => {

            if (cleanDatabaseUrl) {
                await this.cleanTestingDatabases(cleanDatabaseUrl);
            }

            if (app) {
                this._app = http.createServer((await app()).callback());
            }
        });
    },

    request () {
        if (!this._app) {
            throw new Error('The app is not initialized yet!');
        }
        return supertest.agent(this._app);
    },

    /**
     * @param {string} [mongodbUrl]
     * @returns {string|null}
     */
    uniqueDatabase (mongodbUrl) {

        if (!mongodbUrl) {
            return null;
        }

        const parsed = new URL(mongodbUrl);
        parsed.pathname = `${parsed.pathname}___${Date.now()}`;
        return parsed.toString();
    },

    /**
     * @param {string} mongodbUrl
     * @returns {Promise<void>}
     */
    async cleanTestingDatabases (mongodbUrl) {
        const client = new MongoClient(mongodbUrl);
        await client.connect();
        const db = client.db();
        const { databaseName } = db;

        if (!/testing/i.test(databaseName)) {
            throw new Error('The database name has to contains the "testing" keyword.');
        }

        const postfixMatcher = /___([0-9]{12,})/;
        const baseName = databaseName.replace(postfixMatcher, '');

        const matcher = new RegExp(`^${baseName}(${postfixMatcher.source})?$`);
        const adminDb = db.admin();
        const { databases } = await adminDb.listDatabases({ nameOnly: true });

        const maxAgeDate = new Date();
        maxAgeDate.setMinutes(maxAgeDate.getMinutes() - 15);

        await Promise.all(databases.map(async ({ name }) => {
            const [match,, timestamp] = name.match(matcher) || [];
            if (match && (!timestamp || new Date(parseInt(timestamp, 10)) < maxAgeDate)) {
                // eslint-disable-next-line no-console
                console.log(`DROPPING OLD TESTING database ${name}`);
                await client.db(name).dropDatabase();
            }
        }));

        await client.close();
    }


};

module.exports = testUtils;
