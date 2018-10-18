'use strict';

const supertest = require('supertest');
const http = require('http');


const apiTestUtil = {

    _initPromise: false,

    _app: null,

    before (mocha, appFactory) {
        this._initialize(mocha, appFactory);
    },

    request () {
        if (!this._initialized) {
            throw new Error('Mocha should be initialized!');
        }
        return supertest.agent(this._app);
    },

    _initialize (mocha, appFactory) {
        mocha.before((done) => {
            if (!this._initPromise) {
                this._initPromise = appFactory();
            }

            this._initPromise
                .then((app) => {
                    this._app = http.createServer(app.callback());
                    this._initialized = true;
                    done();
                })
                .catch(done);
        });
    }
};

module.exports = apiTestUtil;
