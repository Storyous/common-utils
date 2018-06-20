'use strict';

const promClient = require('prom-client');

const config = require('../../config');
const register = require('./register');

module.exports = {

    /**
     * @returns {function}
     */
    getHttpRequestMetricsMiddleware () {

        const metrics = new promClient.Counter({
            name: 'httpRequest',
            help: 'Query tracking for API.',
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
     * @returns {function}
     */
    getRequestDurationMetricsMiddleware () {

        const summary = new client.Summary({
            name: 'RequestDuration',
            help: 'Tracking of requests duration',
            registers: [register]
        });

        return async (ctx, next) => {
            const end = summary.startTimer({
                method: ctx.request.method,
                path: ctx.request.url,
                env: config.env || null
            });
            await next();
            end();
        };
    }
};
