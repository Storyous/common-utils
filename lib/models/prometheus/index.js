'use strict';

const fetch = require('node-fetch');
const os = require('os');

const register = require('./register');
const prometheusMiddlewares = require('./prometheusMiddlewares');


const prometheus = {

    /**
     * {{
     *  url: String
     *  appName: String
     *  pushInterval: [Number]
     * }} options
     * @returns void
     */
    init (options) {
        const url = encodeURI(`${options.url}/metrics/job/${options.appName}/instance/${os.hostname()}`);
        const interval = options.pushInterval ? Math.floor(options.pushInterval) : 10000;

        // Push periodically all metrics to prometheus gateway.
        // Ignores any errors.
        setInterval(async () => {
            try {
                await fetch(url, {
                    method: 'POST',
                    body: register.metrics()
                });
            } catch (e) {}
        }, interval);
    },

    middlewares: prometheusMiddlewares

};

module.exports = prometheus;
