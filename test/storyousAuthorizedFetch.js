'use strict';

const {
    describe,
    it,
    before,
    beforeEach
} = require('mocha');
const MockedServer = require('mocked-server');
const assert = require('assert');
const { uniqueId } = require('lodash');
const getMongoClient = require('./getMongoClient');
const storyousAuthorizedFetch = require('../lib/storyousAuthorizedFetch').default;

describe('storyousAuthorizedFetch', () => {

    let mongoClient;
    before(async () => {
        mongoClient = await getMongoClient();
    });

    beforeEach(async () => {
        await mongoClient.db().collection('appData').deleteMany();
    });

    const serviceUrl = 'http://127.0.0.1:3944/endpoint';
    const loginUrl = 'http://127.0.0.1:3943';
    const clientId = 'someClientId';
    const clientSecret = 'someClientSecret';
    let lastToken;

    const loginServer = new MockedServer(loginUrl);
    loginServer.authorizeEndpoint = loginServer.post('/api/auth/authorize', (ctx) => {
        assert.deepStrictEqual(ctx.request.body, {
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: 'client_credentials'
        });
        lastToken = uniqueId('someToken');
        ctx.body = {
            token_type: 'Bearer',
            expires_at: new Date(Date.now() + 10 * 60 * 1000),
            access_token: lastToken
        };
    });

    const serviceServer = new MockedServer(serviceUrl);
    serviceServer.endpoint = serviceServer.get('/endpoint');

    const withResponse = (status, body) => (ctx) => {
        assert.strictEqual(ctx.get('authorization'), `Bearer ${lastToken}`);
        ctx.body = body;
        ctx.status = status;
    };

    it('should be ok to do authorized request', async () => {
        // can obtain access token
        loginServer.authorizeEndpoint.handleNext();
        serviceServer.endpoint.handleNext(withResponse(200, { ok: true }));
        const response1 = await storyousAuthorizedFetch(serviceUrl, { loginUrl, clientId, clientSecret });
        assert.deepStrictEqual(await response1.json(), { ok: true });
        loginServer.runAllCheckers();
        serviceServer.runAllCheckers();

        // can use cached token
        loginServer.authorizeEndpoint.notReceive(); // the token should be cached
        serviceServer.endpoint.handleNext(withResponse(200, { ok: true }));
        const response2 = await storyousAuthorizedFetch(serviceUrl, { loginUrl, clientId, clientSecret });
        assert.deepStrictEqual(await response2.json(), { ok: true });
        loginServer.runAllCheckers();
        serviceServer.runAllCheckers();

        // can refresh rejected token
        loginServer.authorizeEndpoint.handleNext();
        loginServer.authorizeEndpoint.notReceive();
        serviceServer.endpoint.handleNext(withResponse(401, null)); // token should be thrown away
        serviceServer.endpoint.handleNext(withResponse(200, { ok: true }));
        const response3 = await storyousAuthorizedFetch(serviceUrl, { loginUrl, clientId, clientSecret });
        assert.deepStrictEqual(await response3.json(), { ok: true });
        loginServer.runAllCheckers();
        serviceServer.runAllCheckers();
    });

});
