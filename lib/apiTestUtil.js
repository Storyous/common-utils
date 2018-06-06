'use strict';

const supertest = require('supertest');
const http = require('http');


const apiTestUtil = {

    _initPromise: false,

    _app: null,

    before (mocha) {
        this._initialize(mocha);
    },

    request () {
        if (!this._initialized) {
            throw new Error('Mocha should be initialized!');
        }
        return supertest.agent(this._app);
    },

    _initialize (mocha, appPromise) {
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
    }
};

module.exports = apiTestUtil;
