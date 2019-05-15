'use strict';

const { describe, it } = require('mocha');
const MockedServer = require('mocked-server');
const assert = require('assert');

const fetch = require('../lib/fetch');


describe('fetch', () => {

    const url = 'http://127.0.0.1:3939/endpoint';

    const withResponse = (status, body = null) => (ctx) => {
        ctx.body = body;
        ctx.status = status;
    };

    const server = new MockedServer(url);
    server.endpoint = server.route('GET', '/endpoint');

    it('should be ok to do request', async () => {
        server.endpoint.handleNext(withResponse(200, '{"ok": true}'));
        const response = await fetch(url);
        assert.deepStrictEqual(await response.json(), { ok: true });
    });

    it('should rejects with proper meta', async () => {

        const status = 500;
        const body = 'Internal Server Error';
        server.endpoint.handleNext(withResponse(status, body));
        await assert.rejects(() => fetch(url), {
            message: 'Response is not ok',
            meta: { request: { url, method: 'GET' }, response: { status, body } }
        });

        const checkNotReceived = server.endpoint.handleNext(async (ctx) => {
            await new Promise(resolve => setTimeout(resolve, 200));
            ctx.body = { ok: 1 };
        });
        await assert.rejects(() => fetch(url, { timeout: 50 }), {
            message: `network timeout at: ${url}`,
            meta: { request: { url, method: 'GET' } }
        });
        checkNotReceived();

    });

    it('should pass not-ok request with expectOk=false', async () => {
        server.endpoint.handleNext(withResponse(500, '{"ok": false}'));
        const response = await fetch(url, { expectOk: false });
        assert.deepStrictEqual(await response.json(), { ok: false });
    });

    describe('fetch.json', function () {

        it('should be possible to fetch json', async () => {
            server.endpoint.handleNext(withResponse(200, '{"ok": true}'));
            const json = await fetch.json(url);
            assert.deepStrictEqual(json, { ok: true });
        });

        it('should throw invalid json', async () => {
            const status = 200;
            const body = 'Internal Server Error';
            server.endpoint.handleNext(withResponse(status, body));
            await assert.rejects(() => fetch.json(url), {
                message: 'Response is not valid JSON',
                meta: { request: { url, method: 'GET' }, response: { status, body } }
            });
        });
    });

    describe('fetch.text', function () {

        it('should be possible to fetch text', async () => {
            server.endpoint.handleNext(withResponse(200, 'Aaa'));
            const text = await fetch.text(url);
            assert.deepStrictEqual(text, 'Aaa');
        });

    });
});
