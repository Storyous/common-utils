'use strict';

require('./config');
const { describe, it } = require('mocha');
const log = require('../lib/models/log');
const AppError = require('../lib/appError');

describe('logging', () => {

    it('should be possible to log with module', async () => {

        // NOTE configure credentials in ./config to see actual log entries in transports

        const logger = log.module('MyModule');

        const appError = AppError.internal(`AppError message ${Math.random()}${Math.random()}`, {
            merchantId: 'adsdfsdsdfsdfsdf',
            body: { password: 'abc' }
        });
        // log.error(appError, { some: 'info', body: { password: 'def' } }); // good stack but invalid call
        logger.error(appError);
        logger.error('appError with text', appError);

        const err = new Error('Native error message');

        logger.error(err);
        logger.error('native error with text', err);

        // log.error('string only message', { some: 'info', body: { password: 'abc' } });

        await new Promise((resolve) => setTimeout(resolve, 1000));
    });

});
