'use strict';
const Koa = require('koa');
const router = require('koa-router')();
const koaBody = require('koa-body');
const winston = require('winston');
const fetch = require('node-fetch');
const {
    describe, it, before, after
} = require('mocha');
const assert = require('assert');

const log = require('../dist/models/log');


const logModule = log.module('extraInfo');
const port = 6789;

async function b (something) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    log.id()
        .info('Inside function still have same correlationId', { something });
}

async function a (something) {
    await b(something);
}

let logs = [];

const app = new Koa();
app.use(log.initKoa());
app.use(koaBody({ includeUnparsed: true }));

app.use(async (ctx, next) => {
    if (ctx.req.url !== '/winston') {
        log.id()
            .info('Message with correlationId', { something: ctx.request.body.something });
    }
    await next();
});

router.post('/winston',
    async (ctx) => {
        // there is [Symbol(unparsedBody)] in body which disallows me to use assert.deepStrictEqual
        // this saves just the normal properties
        const obj = {};
        // eslint-disable-next-line guard-for-in
        for (const property in ctx.request.body) {
            obj[property] = ctx.request.body[property];
        }

        logs.push(obj);
        ctx.body = { success: true };
        ctx.status = 200;
    });

router.post('/valid/path',
    async (ctx) => {
        logModule.id()
            .info('Still correlationId and module name as well', { something: ctx.request.body.something });
        ctx.body = 'something';
        await a(ctx.request.body.something);
    });

app.use(router.routes());

let server = null;
const httpWinstonTransport = new winston.transports.Http({
    port,
    path: '/winston',
    level: 'info'
});

describe('Using Koa with correlationId', () => {
    before(async () => {
        // wait a bit to clear the logs
        await new Promise((resolve) => setTimeout(resolve, 100));
        log.add(httpWinstonTransport);
        server = app.listen(port);
    });

    it('should keep the same correlationId through middlewares and function calls', async () => {
        logs = [];

        await fetch(`http://localhost:${port}/valid/path`, {
            method: 'post',
            body: JSON.stringify({ something: 1 }),
            headers: {
                'Content-Type': 'application/json'
            }
        });
        await new Promise((resolve) => setTimeout(resolve, 100));
        const { correlationId } = logs[0];
        assert.deepStrictEqual(logs, [
            {
                correlationId,
                message: 'Message with correlationId',
                level: 'info',
                something: 1
            },
            {
                correlationId,
                module: 'extraInfo',
                message: 'Still correlationId and module name as well',
                level: 'info',
                something: 1
            },
            {
                correlationId,
                message: 'Inside function still have same correlationId',
                level: 'info',
                something: 1
            }
        ]);
    });

    it('should resolve correlationId and sessionId from request', async () => {
        logs = [];

        await fetch(`http://localhost:${port}/valid/path`, {
            method: 'post',
            body: JSON.stringify({ something: 2 }),
            headers: {
                'Content-Type': 'application/json',
                'x-session-id': 'mySessionId',
                'x-correlation-id': 'myCorrelationId'
            }
        });

        await new Promise((resolve) => setTimeout(resolve, 100));
        assert.deepStrictEqual(logs, [
            {
                something: 2,
                correlationId: 'myCorrelationId',
                sessionId: 'mySessionId',
                message: 'Message with correlationId',
                level: 'info'
            },
            {
                something: 2,
                correlationId: 'myCorrelationId',
                sessionId: 'mySessionId',
                module: 'extraInfo',
                message: 'Still correlationId and module name as well',
                level: 'info'
            },
            {
                something: 2,
                correlationId: 'myCorrelationId',
                sessionId: 'mySessionId',
                message: 'Inside function still have same correlationId',
                level: 'info'
            }
        ]);
    });

    it('should keep right correlationId with concurrent calls', async () => {
        logs = [];

        fetch(`http://localhost:${port}/valid/path`, {
            method: 'post',
            body: JSON.stringify({ something: 1 }),
            headers: {
                'Content-Type': 'application/json'
            }
        });
        await new Promise((resolve) => setTimeout(resolve, 10));
        fetch(`http://localhost:${port}/valid/path`, {
            method: 'post',
            body: JSON.stringify({ something: 2 }),
            headers: {
                'Content-Type': 'application/json'
            }
        });

        await new Promise((resolve) => setTimeout(resolve, 300));

        const correlationId1 = logs[0].correlationId;
        const correlationId2 = logs[2].correlationId;
        assert.deepStrictEqual(logs, [
            {
                correlationId: correlationId1,
                message: 'Message with correlationId',
                level: 'info',
                something: 1
            },
            {
                correlationId: correlationId1,
                module: 'extraInfo',
                message: 'Still correlationId and module name as well',
                level: 'info',
                something: 1
            },
            {
                correlationId: correlationId2,
                message: 'Message with correlationId',
                level: 'info',
                something: 2
            },
            {
                correlationId: correlationId2,
                module: 'extraInfo',
                message: 'Still correlationId and module name as well',
                level: 'info',
                something: 2
            },
            {
                something: 1,
                correlationId: correlationId1,
                message: 'Inside function still have same correlationId',
                level: 'info'
            },
            {
                something: 2,
                correlationId: correlationId2,
                message: 'Inside function still have same correlationId',
                level: 'info'
            }
        ]);
    });


    after(async () => {
        log.remove(httpWinstonTransport);
        server.close();
    });
});
