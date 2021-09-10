'use strict';
const {
    describe,
    it, beforeEach, afterEach, before, after
} = require('mocha');
const assert = require('assert');
const Koa = require('koa');
const koaBody = require('koa-body');
const routerFactory = require('koa-router');
const { JWTIssuer, Scope } = require('@storyous/storyous-jwt');
const _ = require('lodash');
const JWTMockServer = require('./JWTMockServer');
const { jwtPermissions, fetch } = require('../lib');
const {
    scopes, defaultMerchantId, mockPayload, restrictions, expectedPayload, defaultPlaceId, extendedScopes, extendedExpectedPayload
} = require('./JWTAuthorizationMockData');

const {
    validateJwtTokenMiddleware, validatePermissionRightsMiddleWare, validatePermissionRightsStrictMiddleWare,
    authorizeUser, validateMerchantMiddleware
} = jwtPermissions;

const { privateKey } = JWTMockServer;

const port = 3456;
let server;
let app;
let router;

const issuer = new JWTIssuer({ issuer: 'Storyous s.r.o.', privateKey }, { expiresInSec: 3600 });
const jwtTokenSign = (payload) => issuer.createToken(payload, scopes);

const errorCatchingMiddleware = async (ctx, next) => {
    try {
        await next();
    } catch (err) {
        ctx.body = { error: { message: err.message, code: err.code } };
    }
};

const startServerWithToken = ({ publicKeyUrl }) => {
    app = new Koa();
    app.use(koaBody({ includeUnparsed: true }));
    router = routerFactory();
    app.use(errorCatchingMiddleware);
    router.get('/', validateJwtTokenMiddleware({ publicKeyUrl }),
        (ctx) => {
            ctx.body = { jwtPayload: ctx.state.jwtPayload, permissions: ctx.state.permissions };
            ctx.status = 200;
        }
    );
    app.use(router.routes());
    server = app.listen(port);
};

describe('JWT authorization', () => {
    beforeEach(() => startServerWithToken({ publicKeyUrl: 'http://127.0.0.1:3010/getPublicKey' }));
    afterEach(async () => server.close());
    it('should decode token', async () => {
        const signedToken = jwtTokenSign(mockPayload);
        const response = await fetch.json(`http://127.0.0.1:${port}/`,
            {
                method: 'get',
                headers: {
                    'Content-Type': 'application/json',
                    authorization: `"Bearer" ${signedToken}`
                }
            });
        assert.deepStrictEqual(_.omit(response.jwtPayload, 'iat'), expectedPayload);

    });
    it('should fail decode token with invalid publicTesting key', async () => {
        const signedToken = jwtTokenSign(mockPayload);
        await server.close();
        startServerWithToken({ publicKeyUrl: 'http://127.0.0.1:3010/getInvalidPublicKey' });

        const response = await fetch.json(`http://127.0.0.1:${port}/`,
            {
                method: 'get',
                headers: {
                    'Content-Type': 'application/json',
                    authorization: `"Bearer" ${signedToken}`
                }
            });
        assert.deepStrictEqual(response, { error: { message: 'Token is not valid.', code: 401 } });

    });

    it('should fail decode token with different issuer', async () => {
        const mockIssuer = new JWTIssuer({ issuer: 'mockUser', privateKey });
        const signedToken = mockIssuer.createToken(mockPayload, scopes);

        const response = await fetch.json(`http://127.0.0.1:${port}/`,
            {
                method: 'get',
                headers: {
                    'Content-Type': 'application/json',
                    authorization: `"Bearer" ${signedToken}`
                }
            });
        assert.deepStrictEqual(response, { error: { message: 'Token is not valid.', code: 401 } });
    });

    it('should fail decode expired token', async () => {
        const expiredIssuer = new JWTIssuer({ issuer: 'Storyous s.r.o.', expiresInSec: 0, privateKey });
        const signedToken = expiredIssuer.createToken(mockPayload, scopes);

        const response = await fetch.json(`http://127.0.0.1:${port}/`,
            {
                method: 'get',
                headers: {
                    'Content-Type': 'application/json',
                    authorization: `"Bearer" ${signedToken}`
                }
            });
        assert.deepStrictEqual(response, { error: { message: 'Token is expired.', code: 401 } });
    });
    it('should fail on missing authorization', async () => {

        const response = await fetch.json(`http://127.0.0.1:${port}/`,
            {
                method: 'get',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        assert.deepStrictEqual(response, { error: { message: 'Token is not valid.', code: 401 } });
    });
});
describe('JWT authorization and permission validation', () => {
    before(async () => {
        app = new Koa();
        app.use(koaBody({ includeUnparsed: true }));
        router = routerFactory();
        app.use(errorCatchingMiddleware);
        router.get('/', validateJwtTokenMiddleware({ publicKeyUrl: 'http://127.0.0.1:3010/getPublicKey' }),
            validatePermissionRightsMiddleWare(10),
            (ctx) => {
                ctx.body = {
                    jwtPayload: ctx.state.jwtPayload
                };
                ctx.status = 200;
            }
        );
        app.use(router.routes());
        server = app.listen(port);
    });

    after(async () => server.close());

    it('should validate permissions', async () => {
        const signedToken = jwtTokenSign(mockPayload);
        const response = await fetch.json(`http://127.0.0.1:${port}/`,
            {
                method: 'get',
                headers: {
                    'Content-Type': 'application/json',
                    authorization: `"Bearer" ${signedToken}`
                }
            });

        assert.deepStrictEqual(_.omit(response.jwtPayload, 'iat'), expectedPayload);
    });

    it('should fail on invalid permissions', async () => {
        const invalidPermissionScope = [new Scope(
            'perms',
            restrictions,
            '000'
        )];
        const signedToken = issuer.createToken(mockPayload, invalidPermissionScope);

        const response = await fetch.json(`http://127.0.0.1:${port}/`,
            {
                method: 'get',
                headers: {
                    'Content-Type': 'application/json',
                    authorization: `"Bearer" ${signedToken}`
                }
            });
        assert.deepStrictEqual(response, {
            error: {
                message: 'Not sufficient permissions.',
                code: 403
            }
        });
    });
});

describe('JWT authorization and strict permission validation', () => {
    before(async () => {
        app = new Koa();
        app.use(koaBody({ includeUnparsed: true }));
        router = routerFactory();
        app.use(errorCatchingMiddleware);
        router.get('/', validateJwtTokenMiddleware({ publicKeyUrl: 'http://127.0.0.1:3010/getPublicKey' }),
            validatePermissionRightsStrictMiddleWare([8, 9]),
            (ctx) => {
                ctx.body = {
                    jwtPayload: ctx.state.jwtPayload
                };
                ctx.status = 200;
            }
        );
        app.use(router.routes());
        server = app.listen(port);
    });

    after(async () => server.close());

    it('should validate permissions', async () => {
        const signedToken = jwtTokenSign(mockPayload);

        const response = await fetch.json(`http://127.0.0.1:${port}/`,
            {
                method: 'get',
                headers: {
                    'Content-Type': 'application/json',
                    authorization: `"Bearer" ${signedToken}`
                }
            });
        assert.deepStrictEqual(_.omit(response.jwtPayload, 'iat'), expectedPayload);
    });

    it('should fail on invalid permissions', async () => {
        const invalidPermissionScope = [new Scope(
            'perms',
            restrictions,
            '008'
        )];
        const signedToken = issuer.createToken(mockPayload, invalidPermissionScope);

        const response = await fetch.json(`http://127.0.0.1:${port}/`,
            {
                method: 'get',
                headers: {
                    'Content-Type': 'application/json',
                    authorization: `"Bearer" ${signedToken}`
                }
            });
        assert.deepStrictEqual(response, {
            error: {
                message: 'Not sufficient permissions.',
                code: 403
            }
        });
    });
});
describe('JWT authorization and merchant validation', () => {
    before(async () => {
        app = new Koa();
        app.use(koaBody({ includeUnparsed: true }));
        router = routerFactory();
        app.use(errorCatchingMiddleware);
        router.get('/:merchantId', validateJwtTokenMiddleware({ publicKeyUrl: 'http://127.0.0.1:3010/getPublicKey' }),
            validateMerchantMiddleware,
            (ctx) => {
                ctx.body = {
                    jwtPayload: ctx.state.jwtPayload
                };
                ctx.status = 200;
            });
        router.get('/merchantPlace/:merchantPlaceId',
            validateJwtTokenMiddleware({ publicKeyUrl: 'http://127.0.0.1:3010/getPublicKey' }),
            validateMerchantMiddleware,
            (ctx) => {
                ctx.body = {
                    jwtPayload: ctx.state.jwtPayload
                };
                ctx.status = 200;
            });

        app.use(router.routes());
        server = app.listen(port);
    });

    after(async () => server.close());

    it('should validate merchant', async () => {
        const signedToken = jwtTokenSign(mockPayload);

        const response = await fetch.json(`http://127.0.0.1:${port}/${defaultMerchantId}`,
            {
                method: 'get',
                headers: {
                    'Content-Type': 'application/json',
                    authorization: `"Bearer" ${signedToken}`
                }
            });
        assert.deepStrictEqual(_.omit(response.jwtPayload, 'iat'), expectedPayload);
    });

    it('should fail on invalid merchantId', async () => {
        const signedToken = jwtTokenSign(mockPayload);
        const invalidMerchantId = '1234567890abcd';

        const response = await fetch.json(`http://127.0.0.1:${port}/${invalidMerchantId}`,
            {
                method: 'get',
                headers: {
                    'Content-Type': 'application/json',
                    authorization: `"Bearer" ${signedToken}`
                }
            });
        assert.deepStrictEqual(response, {
            error: {
                message: 'Not authorized.',
                code: 401
            }
        });
    });

    it('should validate placeId', async () => {
        const signedToken = jwtTokenSign(mockPayload);

        const response = await fetch.json(`http://127.0.0.1:${port}/merchantPlace/${defaultMerchantId}-${defaultPlaceId}`,
            {
                method: 'get',
                headers: {
                    'Content-Type': 'application/json',
                    authorization: `"Bearer" ${signedToken}`
                }
            });
        assert.deepStrictEqual(_.omit(response.jwtPayload, 'iat'), expectedPayload);
    });

    it('should validate placeId *', async () => {
        const signedToken = issuer.createToken(mockPayload, extendedScopes);

        const response = await fetch.json(`http://127.0.0.1:${port}/merchantPlace/${defaultMerchantId}-*`,
            {
                method: 'get',
                headers: {
                    'Content-Type': 'application/json',
                    authorization: `"Bearer" ${signedToken}`
                }
            });
        assert.deepStrictEqual(_.omit(response.jwtPayload, 'iat'), extendedExpectedPayload);
    });
    it('should fail on invalid placeId', async () => {
        const signedToken = jwtTokenSign(mockPayload);
        const invalidPlaceId = '12345kgfkd';
        const response = await fetch.json(`http://127.0.0.1:${port}/merchantPlace/${defaultMerchantId}-${invalidPlaceId}`,
            {
                method: 'get',
                headers: {
                    'Content-Type': 'application/json',
                    authorization: `"Bearer" ${signedToken}`
                }
            });
        assert.deepStrictEqual(response, {
            error: {
                message: 'Not authorized.',
                code: 401
            }
        });
    });
});
describe.only('test authorization function', () => {
    const signedToken = jwtTokenSign(mockPayload);

    it('should validate', async () => {
        let err = null;
        try {
            await authorizeUser(
                signedToken,
                defaultMerchantId,
                { publicKeyUrl: 'http://127.0.0.1:3010/getPublicKey', permissions: [8, 9] });
        } catch (e) {
            err = e;
        }
        assert(!err);
    });

    it('should fail on expired token', async () => {
        let err = null;
        const expiredIssuer = new JWTIssuer({ issuer: 'Storyous s.r.o.', expiresInSec: 0, privateKey });
        const expiredToken = expiredIssuer.createToken(mockPayload, scopes);
        try {
            await authorizeUser(
                expiredToken,
                defaultMerchantId,
                { publicKeyUrl: 'http://127.0.0.1:3010/getPublicKey', permissions: [8, 9] });
        } catch (e) {
            err = e;
        }
        assert(err);
        assert.deepStrictEqual(err.message, 'Token is expired.');
        assert.deepStrictEqual(err.code, 401);
    });

    it('should fail on invalid token issuer', async () => {
        let err = null;
        const mockIssuer = new JWTIssuer({ issuer: 'mockUser', privateKey });
        const invalidIssuerToken = mockIssuer.createToken(mockPayload, scopes);
        try {
            await authorizeUser(
                invalidIssuerToken,
                defaultMerchantId,
                { publicKeyUrl: 'http://127.0.0.1:3010/getPublicKey', permissions: [8, 9] });
        } catch (e) {
            err = e;
        }
        assert(err);
        assert.deepStrictEqual(err.message, 'Token is not valid.');
        assert.deepStrictEqual(err.code, 401);
    });
    it('should fail on invalid public key', async () => {
        let err = null;
        const invalidIssuerToken = issuer.createToken(mockPayload, scopes);
        try {
            await authorizeUser(
                invalidIssuerToken,
                defaultMerchantId,
                { publicKeyUrl: 'http://127.0.0.1:3010/getInvalidPublicKey', permissions: [8, 9] });
        } catch (e) {
            err = e;
        }
        assert(err);
        assert.deepStrictEqual(err.message, 'Token is not valid.');
        assert.deepStrictEqual(err.code, 401);
    });

    it('should fail on invalid merchant', async () => {
        let err = null;
        const invalidMerchant = '9876543210abcd';
        try {
            await authorizeUser(
                signedToken,
                invalidMerchant,
                { publicKeyUrl: 'http://127.0.0.1:3010/getPublicKey', permissions: [8, 9] });
        } catch (e) {
            err = e;
        }
        assert(err);
        assert.deepStrictEqual(err.message, 'Not authorized.');
        assert.deepStrictEqual(err.code, 401);
    });
    it('should fail on invalid placeId', async () => {
        let err = null;
        const invalidPlaceId = '9876543210abcd2DDW';
        try {
            await authorizeUser(
                signedToken,
                defaultMerchantId,
                { publicKeyUrl: 'http://127.0.0.1:3010/getPublicKey', permissions: [8, 9], placeId: invalidPlaceId });
        } catch (e) {
            err = e;
        }
        assert(err);
        assert.deepStrictEqual(err.message, 'Not authorized.');
        assert.deepStrictEqual(err.code, 401);
    });
    it('should fail on invalid permission', async () => {
        let err = null;
        try {
            await authorizeUser(
                signedToken,
                defaultMerchantId,
                { publicKeyUrl: 'http://127.0.0.1:3010/getPublicKey', permissions: [1, 2] });
        } catch (e) {
            err = e;
        }
        assert(err);
        assert.deepStrictEqual(err.message, 'Not sufficient permissions.');
        assert.deepStrictEqual(err.code, 403);

    });
});
