'use strict';

require('./config');
const { describe, it } = require('mocha');
const log = require('../dist/models/log');
const AppError = require('../dist/appError');
const errorHandler = require('../dist/errorHandler');
const fetch = require('../dist/fetch');


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

        log.error(appError);

        const ctx = {
            request: {
                query: {}, body: {}, originalUrl: '/aaa/bbb', is: () => false
            },
            req: { method: 'GET' },
            get: (h) => h
        };

        await errorHandler(ctx, async () => {
            await fetch.json('https://sdfsdfsdfsdfsdsf.ct?sdfsdf=vsfsdf', {
                method: 'POST',
                body: JSON.stringify('aasdsdsd')
            });
        });

        // log.error('string only message', { some: 'info', body: { password: 'abc' } });

        await new Promise((resolve) => setTimeout(resolve, 1000));
    });

});
