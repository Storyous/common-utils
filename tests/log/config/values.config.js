'use strict';

module.exports = {

    port: process.env.PORT || 8088,
    debugEnabled: false,
    production: false,

    logging: {
        console: {
            silent: false
        },
        loggly: {
            silent: true,
            token: '', // ADD token for develop purposes and set silent to false
            subdomain: 'storyous',
            tags: ['sandbox', process.env.NODE_ENV],
            json: true
        },
        sentry: {
            dsn: '', // ADD DSN to sandbox for develop purposes
            level: 'error',
            silent: false
        }
    }
};
