'use strict';

// Config structure that must be preserved

module.exports = {
    logging: {
        console: {
            silent: false,
            level: 'info',
            colorize: true
        },
        graylog: {
            silent: true,
            server: {
                adapterOptions: {
                    host: 'graylog2.storyous.xyz',
                    port: 12216
                }
            }
        },
        sentry: {
            dsn: process.env.SENTRY_DSN || '',
            silent: true,
            level: 'error'
        },
        loggly: {
            silent: true,
            token: process.env.LOGGLY_TOKEN || '',
            subdomain: 'storyous',
            json: true
        }
    }
};
