'use strict';

const promClient = require('prom-client');

const prometheus = {

    httpRequest: null,

    register: null,

    init () {

        this.register = new promClient.Registry();

        promClient.collectDefaultMetrics({ register: this.register });

        this.httpRequest = new promClient.Counter({
            name: 'httpRequest',
            help: 'Query tracking for Terms API',
            labelNames: ['name', 'query', 'status', 'message', 'originalUrl'],
            registers: [this.register]
        });


    }

};

module.exports = prometheus;
