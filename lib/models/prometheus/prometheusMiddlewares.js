'use strict';

const promClient = require('prom-client');

const config = require('../../config');
const register = require('./register');


function getPath (ctx) {
    let path = ctx.req.url;
    if (ctx.matched && ctx.matched.length) {
        path = ctx.matched[0].path; // eslint-disable-line prefer-destructuring
    }
    return path;
}

module.exports = {

    /**
     * {{
     *  appName: String
     * }} options
     * @returns {function}
     * @deprecated
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
                method: ctx.request.method,
                path: getPath(ctx),
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

        const histogram = new promClient.Histogram({
            name: 'httpRequestDuration',
            help: 'Requests duration tracking',
            labelNames: ['name', 'method', 'env', 'path'],
            registers: [register]
        });

        return async (ctx, next) => {
            const end = histogram.startTimer({
                name: options.appName,
                method: ctx.request.method,
                env: config.env || null
            });
            await next();
            end({
                status: ctx.response.status,
                path: getPath(ctx)
            });
        };
    }
};
