'use strict';

const supertest = require('supertest');
const http = require('http');
const db = require('./models/db');


const apiTestUtil = {

    _initPromise: false,

    _app: null,

    before (mocha, appPromise, cfg = null) {
        this._initialize(mocha, appPromise, cfg);
    },

    request () {

        if (!this._initialized) {
            throw new Error('Mocha should be initialized!');
        }

        return supertest.agent(this._app);
    },

    _initialize (mocha, appPromise, cfg) {

        if (!this._initPromise) {
            this._initPromise = appPromise;
        }

        mocha.before((done) => {
            this._initPromise.then((app) => {
                this._app = http.createServer(app.callback());
                this._initialized = true;
                done();
            }, done);
        });

        if (cfg && cfg.dropAfterTestRun) {
            mocha.after((done) => {
                db.db.dropDatabase()
                    .then(() => done())
                    .catch(done);
            });
        }
    }
};

module.exports = apiTestUtil;
