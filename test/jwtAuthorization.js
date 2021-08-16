'use strict';
require('./config');
const {
    describe,
    it, before, beforeEach, after, afterEach
} = require('mocha');
const assert = require('assert');
const Koa = require('koa');
const koaBody = require('koa-body');
const router = require('koa-router')();
const { JWTIssuer } = require('@storyous/storyous-jwt');
const JWTMockServer = require('./JWTMockServer');
const { jwtPermissions, fetch } = require('../lib');

const {
    validateJwtWithPermissions, checkPermissionRights, init
} = jwtPermissions;


const {
    privateKey, publicKey, invalidPublicKey, url
} = JWTMockServer;

const mockPayload = { merchantId: '123456789abc', permissions: '00F' };
let signedToken;
const port = 3456;
let server = null;
let app = new Koa();


let issuer = new JWTIssuer({ issuer: 'Storyous s.r.o.', privateKey });
const jwtTokenSign = (payload) => issuer.createToken(payload, []);
const startServerwithToken = (token, { publicKeyUrl }) => {
    app = new Koa();
    app.use(koaBody({ includeUnparsed: true }));
    router.get('/', validateJwtWithPermissions(token, { publicKeyUrl }),
        (ctx) => {
            ctx.body = { jwtPayload: ctx.state.jwtPayload, permissions: ctx.state.permissions };
            ctx.status = 200;
        }
    );

    app.use(router.routes());
    server = app.listen(port);
};


describe.only('JWT authorization', () => {
    afterEach(async () => await server.close());
    it.only('should decode token', async () => {
        signedToken = jwtTokenSign(mockPayload, privateKey);
        startServerwithToken(signedToken, {});
        const expectedPayload = {
            merchantId: mockPayload.merchantId,
            decodedPermissions:
                [false, false, false, false, false, false, false, false, true, true, true, true]
        };

        const response = await fetch.json(`http://127.0.0.1:${port}/`,
            {
                method: 'get',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        assert.deepStrictEqual(response.jwtPayload.decodedPayload, expectedPayload);

        await new Promise((resolve) => setTimeout(resolve, 1000));

    });
    it.only('should fail decode token with invalid public key', async () => {
        signedToken = jwtTokenSign(mockPayload, privateKey);
        startServerwithToken(signedToken, { publicKeyUrl: 'http://127.0.0.1:3010/getInvalidPublicKey' });
        let error;
        try {
            await fetch.json(`http://127.0.0.1:${port}/`,
                {
                    method: 'get',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
        } catch (e) {
            error = e;
        }
        assert(error instanceof Error);
        await new Promise((resolve) => setTimeout(resolve, 1000));
    });

    it('should fail decode token with different issuer', async () => {
        issuer = new JWTIssuer({ issuer: 'mockUser', privateKey });
        signedToken = issuer.createToken(mockPayload, []);
        startServerwithToken(signedToken, {});
        let error;
        try {
            await fetch.json(`http://127.0.0.1:${port}/`,
                {
                    method: 'get',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
        } catch (e) {
            error = e;
        }
        assert(error instanceof Error);
        await new Promise((resolve) => setTimeout(resolve, 1000));
    });

    it('should fail decode expired token', async () => {
        issuer = new JWTIssuer({ issuer: 'Storyous s.r.o.', expiresInSec: 0, privateKey });
        signedToken = issuer.createToken(mockPayload, []);
        startServerwithToken(signedToken, {});
        let error;
        try {
            await fetch.json(`http://127.0.0.1:${port}/`,
                {
                    method: 'get',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
        } catch (e) {
            error = e;
        }
        assert(error instanceof Error);
        await new Promise((resolve) => setTimeout(resolve, 1000));
    });
});
