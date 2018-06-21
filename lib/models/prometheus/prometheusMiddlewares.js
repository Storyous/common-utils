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
    getHttpRequestMetricsMiddleware (options) {

        const metrics = new promClient.Counter({
            name: 'httpRequest',
            help: 'Request rate tracking',
            labelNames: ['name', 'query', 'status', 'message', 'originalUrl'],
            registers: [register]
        });

        return async (ctx, next) => {
            await next();
            metrics.inc({
                name: options.appName,
                status: ctx.response.status,
                originalUrl: ctx.originalUrl,
                env: config.env || null
            });
        };
    },

    /**
     * {{
     *  appName: String
     * }} options
     * @returns {function}
     */
    getRequestDurationMetricsMiddleware (options) {

        const summary = new promClient.Summary({
            name: 'httpRequestDuration',
            help: 'Requests duration tracking',
            registers: [register]
        });

        return async (ctx, next) => {
            const end = summary.startTimer({
                name: options.appName,
                method: ctx.request.method,
                path: ctx.request.url,
                env: config.env || null
            });
            await next();
            end();
        };
    }
};
