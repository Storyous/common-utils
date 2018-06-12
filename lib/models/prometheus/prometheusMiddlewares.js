'use strict';

const promClient = require('prom-client');
const fetch = require('node-fetch');
const os = require('os');


module.exports = {

    /**
     * {{
     *  url: String
     *  appName: String
     *  metricsName: String
     *  description: String
     *  labelNames: String[]
     *  pushInterval: [Number]
     * }} options
     * @returns {function}
     */
    getHttpRequestMetricsMiddleware (options) {

        const url = encodeURI(`${options.url}/metrics/job/${options.metricsName}/instance/${os.hostname()}`);
        const interval = options.pushInterval ? Math.floor(options.pushInterval) : 10000;
        const register = new promClient.Registry();

        const metrics = new promClient.Counter({
            name: options.metricsName,
            help: options.description,
            labelNames: options.labelNames,
            registers: [register]
        });

        // Push periodically all metrics to prometheus gateway.
        // Ignores any errors.
        setInterval(async () => {
            await fetch(url, {
                method: 'POST',
                body: register.metrics()
            }).catch(() => {});
        }, interval);

        return async (ctx, next) => {
            await next();
            metrics.inc({
                name: options.appName,
                status: ctx.response.status,
                originalUrl: ctx.originalUrl
            });
        };
    }
};
