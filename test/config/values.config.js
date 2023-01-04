'use strict';

module.exports = {

    port: process.env.PORT || 8088,
    debugEnabled: false,
    production: false,

    mongodbUrl: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/common-utils-testing',

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
    },

    mailer: {
        transporter: {
            auth: {
                user: 'from@saltpay.co',
            }
        }
    }
};
