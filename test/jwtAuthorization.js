'use strict';
require('./config');
const {
    describe,
    it, beforeEach, afterEach
} = require('mocha');
const assert = require('assert');
const Koa = require('koa');
const koaBody = require('koa-body');
const routerFactory = require('koa-router');
const { JWTIssuer } = require('@storyous/storyous-jwt');
const JWTMockServer = require('./JWTMockServer');
const { jwtPermissions, fetch } = require('../lib');

const {
    validateJwtWithPermissions, checkPermissionRights, checkPermissionRightsStrict
} = jwtPermissions;


const { privateKey } = JWTMockServer;

const mockPayload = { merchantId: '123456789abc', permissions: '00F' };
let expectedPayload = {
    merchantId: mockPayload.merchantId,
    decodedPermissions:
        [false, false, false, false, false, false, false, false, true, true, true, true]
};

let signedToken;
const port = 3456;
let server;
let app;
let router;


let issuer = new JWTIssuer({ issuer: 'Storyous s.r.o.', privateKey });
const jwtTokenSign = (payload) => issuer.createToken(payload, []);

const startServerWithToken = ({ publicKeyUrl }) => {
    app = new Koa();
    app.use(koaBody({ includeUnparsed: true }));
    router = routerFactory();
    router.get('/', validateJwtWithPermissions({ publicKeyUrl }),
        (ctx) => {
            ctx.body = { jwtPayload: ctx.state.jwtPayload, permissions: ctx.state.permissions };
            ctx.status = 200;
        }
    );
    app.use(router.routes());
    server = app.listen(port);
};


describe.only('JWT authorization', () => {
    beforeEach(() => startServerWithToken({}));
    afterEach(async () => server.close());
    it('should decode token', async () => {
        signedToken = jwtTokenSign(mockPayload, privateKey);
        const response = await fetch.json(`http://127.0.0.1:${port}/`,
            {
                method: 'get',
                headers: {
                    'Content-Type': 'application/json',
                    authorization: `"Bearer" ${signedToken}`
                }
            });
        assert.deepStrictEqual(response.jwtPayload.decodedPayload, expectedPayload);


    });
    it('should fail decode token with invalid public key', async () => {
        signedToken = jwtTokenSign(mockPayload, privateKey);
        await server.close();
        startServerWithToken({ publicKeyUrl: 'http://127.0.0.1:3010/getInvalidPublicKey' });
        let error;
        try {
            await fetch.json(`http://127.0.0.1:${port}/`,
                {
                    method: 'get',
                    headers: {
                        'Content-Type': 'application/json',
                        authorization: `"Bearer" ${signedToken}`
                    }
                });
        } catch (e) {
            error = e;
        }
        assert(error instanceof Error);

    });

    it('should fail decode token with different issuer', async () => {
        issuer = new JWTIssuer({ issuer: 'mockUser', privateKey });
        signedToken = issuer.createToken(mockPayload, []);
        let error;
        try {
            await fetch.json(`http://127.0.0.1:${port}/`,
                {
                    method: 'get',
                    headers: {
                        'Content-Type': 'application/json',
                        authorization: `"Bearer" ${signedToken}`
                    }
                });
        } catch (e) {
            error = e;
        }
        assert(error instanceof Error);
    });

    it('should fail decode expired token', async () => {
        issuer = new JWTIssuer({ issuer: 'Storyous s.r.o.', expiresInSec: 0, privateKey });
        signedToken = issuer.createToken(mockPayload, []);
        let error;
        try {
            await fetch.json(`http://127.0.0.1:${port}/`,
                {
                    method: 'get',
                    headers: {
                        'Content-Type': 'application/json',
                        authorization: `"Bearer" ${signedToken}`
                    }
                });
        } catch (e) {
            error = e;
        }
        assert(error instanceof Error);
    });
    it('should fail on missing authorization', async () => {
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
    });
});
describe('JWT authorization and permission validation', () => {
    beforeEach(async () => {
        app = new Koa();
        app.use(koaBody({ includeUnparsed: true }));
        router = routerFactory();
        router.get('/', validateJwtWithPermissions({}), checkPermissionRights(3),
            (ctx) => {
                ctx.body = { jwtPayload: ctx.state.jwtPayload, permissions: ctx.state.permissions };
                ctx.status = 200;
            }
        );
        app.use(router.routes());
        server = app.listen(port);
    });

    afterEach(async () => server.close());

    it('should validate permissions', async () => {
        issuer = new JWTIssuer({ issuer: 'Storyous s.r.o.', privateKey });
        signedToken = issuer.createToken({ ...mockPayload, permissions: '1' }, []);

        const response = await fetch.json(`http://127.0.0.1:${port}/`,
            {
                method: 'get',
                headers: {
                    'Content-Type': 'application/json',
                    authorization: `"Bearer" ${signedToken}`
                }
            });
        expectedPayload = { ...expectedPayload, decodedPermissions: [false, false, false, true] };
        assert.deepStrictEqual(response.jwtPayload.decodedPayload, expectedPayload);
        assert.deepStrictEqual(response.permissions, [false, false, false, true]);
    });

    it('should fail on invalid permissions', async () => {
        issuer = new JWTIssuer({ issuer: 'Storyous s.r.o.', privateKey });
        signedToken = issuer.createToken({ ...mockPayload, permissions: '2' }, []);

        let error;
        try {
            await fetch.json(`http://127.0.0.1:${port}/`,
                {
                    method: 'get',
                    headers: {
                        'Content-Type': 'application/json',
                        authorization: `"Bearer" ${signedToken}`
                    }
                });
        } catch (e) {
            error = e;
        }
        assert(error instanceof Error);
    });

    it('should fail on missing permissions', async () => {
        issuer = new JWTIssuer({ issuer: 'Storyous s.r.o.', privateKey });
        signedToken = issuer.createToken({ merchantId: mockPayload.merchantId }, []);

        let error;
        try {
            await fetch.json(`http://127.0.0.1:${port}/`,
                {
                    method: 'get',
                    headers: {
                        'Content-Type': 'application/json',
                        authorization: `"Bearer" ${signedToken}`
                    }
                });
        } catch (e) {
            error = e;
        }
        assert(error instanceof Error);
    });
});


describe.only('JWT authorization and strict permission validation', () => {
    beforeEach(async () => {
        app = new Koa();
        app.use(koaBody({ includeUnparsed: true }));
        router = routerFactory();
        router.get('/', validateJwtWithPermissions({}), checkPermissionRightsStrict([2, 3]),
            (ctx) => {
                ctx.body = {
                    jwtPayload: ctx.state.jwtPayload,
                    permissions: ctx.state.permissions
                };
                ctx.status = 200;
            }
        );
        app.use(router.routes());
        server = app.listen(port);
    });

    afterEach(async () => server.close());


    it('should validate permissions', async () => {
        issuer = new JWTIssuer({ issuer: 'Storyous s.r.o.', privateKey });
        signedToken = issuer.createToken({ ...mockPayload, permissions: '7' }, []);

        const response = await fetch.json(`http://127.0.0.1:${port}/`,
            {
                method: 'get',
                headers: {
                    'Content-Type': 'application/json',
                    authorization: `"Bearer" ${signedToken}`
                }
            });
        const decodedPermissions = [false, true, true, true];
        const decodedPayload = { ...expectedPayload, decodedPermissions };
        assert.deepStrictEqual(response.jwtPayload.decodedPayload, decodedPayload);
        assert.deepStrictEqual(response.permissions, decodedPermissions);
    });

    it('should fail on invalid permissions', async () => {
        issuer = new JWTIssuer({ issuer: 'Storyous s.r.o.', privateKey });
        signedToken = issuer.createToken({ ...mockPayload, permissions: '6' }, []);

        let error;
        try {
            await fetch.json(`http://127.0.0.1:${port}/`,
                {
                    method: 'get',
                    headers: {
                        'Content-Type': 'application/json',
                        authorization: `"Bearer" ${signedToken}`
                    }
                });
        } catch (e) {
            error = e;
        }
        assert(error instanceof Error);
    });

    it('should fail on missing permissions', async () => {
        issuer = new JWTIssuer({ issuer: 'Storyous s.r.o.', privateKey });
        signedToken = issuer.createToken({ merchantId: mockPayload.merchantId }, []);

        let error;
        try {
            await fetch.json(`http://127.0.0.1:${port}/`,
                {
                    method: 'get',
                    headers: {
                        'Content-Type': 'application/json',
                        authorization: `"Bearer" ${signedToken}`
                    }
                });
        } catch (e) {
            error = e;
        }
        assert(error instanceof Error);
    });
});
