'use strict';

const promClient = require('prom-client');

const config = require('../../config');
const register = require('./register');

module.exports = {

    /**
     * {{
     *  appName: String
     * }} options
     * @returns {function}
     */
    getRequestDurationMetricsMiddleware (options) {

        const histogram = new promClient.Histogram({
            name: 'httpRequestDuration',
            help: 'Requests duration tracking',
            labelNames: ['name', 'env', 'status'],
            registers: [register]
        });

        return async (ctx, next) => {
            const end = histogram.startTimer({
                name: options.appName,
                env: config.env || null
            });
            await next();
            end({
                status: ctx.response.status
            });
        };
    }
};
