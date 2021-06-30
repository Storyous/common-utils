'use strict';
const Koa = require('koa');
const supertest = require('supertest');

require('./config');
const {
    describe,
    it
} = require('mocha');
const log = require('../lib/models/log');
const AppError = require('../lib/appError');
const errorHandler = require('../lib/errorHandler');
const fetch = require('../lib/fetch');


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
                query: {},
                body: {},
                originalUrl: '/aaa/bbb',
                is: () => false
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


    it('should be possible to use log-middleware without params', async () => {
        const app = new Koa();
        app.use(log.initKoa());
        app.use(log.basicLogMiddleware());
        const server = app.listen();

        // not 500 means it did not fail
        await supertest(server)
            .get('/anything')
            .expect(404);

        await server.close();
    });

    it('should be possible to use log middleware with params', async () => {
        const app = new Koa();
        app.use(log.initKoa());
        app.use(log.basicLogMiddleware({ fullLogMethods: ['PUT'] }));
        const server = app.listen();

        // not 500 means it did not fail
        await supertest(server)
            .get('/anything')
            .expect(404);

        await server.close();
    });

    it('should be possible to use log middleware with squashByUrls param', async () => {
        const app = new Koa();
        app.use(log.initKoa());
        app.use(log.basicLogMiddleware({ squashByUrls: ['something'] }));
        const server = app.listen();

        // not 500 means it did not fail
        await supertest(server)
            .get('/anything')
            .expect(404);

        await server.close();
    });

    it('should use logs and shortcuts without error', async () => {
        log.trace('abc', { a: 'b' });
        log.silly('abc', { a: 'b' });
        log.debug('abc', { a: 'b' });
        log.info('abc', { a: 'b' });
        log.warn('abc', { a: 'b' });
        log.error('abc', { a: 'b' });

        log.s('abc', { a: 'b' });
        log.t('abc', { a: 'b' });
        log.d('abc', { a: 'b' });
        log.i('abc', { a: 'b' });
        log.w('abc', { a: 'b' });
        log.e('abc', { a: 'b' });
    });
});
