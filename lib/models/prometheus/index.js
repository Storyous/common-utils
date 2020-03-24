'use strict';

const fetch = require('node-fetch');
const os = require('os');
const { uniqBy } = require('lodash');
const client = require('prom-client');

const register = require('./register');
const prometheusMiddlewares = require('./prometheusMiddlewares');


const prometheus = {

    _baseUrl: null,

    /**
     * {{
     *  url: String
     *  appName: String
     *  pushInterval: [Number]
     * }} options
     * @returns void
     */
    init (options) {

        this._baseUrl = `${options.url}/metrics`;

        const url = encodeURI(`${this._baseUrl}/job/${options.appName}/instance/${os.hostname()}`);
        const interval = options.pushInterval ? Math.floor(options.pushInterval) : 10000;

        // Push periodically all metrics to prometheus gateway.
        // Ignores any errors.
        const pushPeriodically = async () => {
            try {
                await new Promise((resolve) => setTimeout(resolve, interval));
                await fetch(url, { method: 'POST', body: register.metrics() });
            } catch (e) {
                // ignore all errors
            }
            pushPeriodically();
        };
        pushPeriodically();
    },

    /**
     * @param {string} baseUrl
     * @returns {Promise.<void>}
     */
    async truncatePushGateway (baseUrl = this._baseUrl) {

        const response = await fetch(baseUrl);
        if (response.status < 200 || response.status >= 400) {
            throw new Error('Cannot fetch prometheus metrics');
        }

        const metricsText = await response.text();

        let allCombinations = metricsText.split(/[\r\n]+/g)
            .map((row) => {
                const job = (row.match(/job="([^"]+)"/i) || [])[1];
                const instance = (row.match(/instance="([^"]+)"/i) || [])[1];

                return { job, instance };
            })
            .filter((combination) => !!combination.job);

        allCombinations = uniqBy(allCombinations, ({ job, instance }) => `${job}-${instance}`);

        for (const { job, instance } of allCombinations) {
            let url = `${baseUrl}/job/${job}`;
            if (instance) {
                url = `${url}/instance/${instance}`;
            }
            const deleteResponse = await fetch(url, { // eslint-disable-line no-await-in-loop
                method: 'DELETE'
            });

            if (deleteResponse.status < 200 || deleteResponse.status >= 400) {
                throw new Error('Cannot fetch prometheus metrics');
            }
        }
    },

    middlewares: prometheusMiddlewares,

    register,

    client

};

module.exports = prometheus;
