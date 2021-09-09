'use strict';
const { JWTVerifier } = require('@storyous/storyous-jwt');
const fs = require('fs');
const path = require('path');
const config = require('../../../lib/config');
// eslint-disable-next-line import/no-unresolved
const { permissionHelper, fetch } = require('../../index');
const {
    NotSufficientPermissions, InvalidToken, ExpiredToken, UserNotAuthorised
} = require('./customErrors');

const publicKeys = {};
let _publicKeyUrl;
let keyName;
let _loadPublicKeyFromFile;
const PERMISSION_SCOPE = 'perms';

if (config.isProduction()) {
    _publicKeyUrl = 'http://publickey.storyous.com'; keyName = 'publicProduction';
} else if (config.isTesting()) {
    _publicKeyUrl = 'http://127.0.0.1:3010/getPublicKey'; keyName = 'publicTesting';
} else { _publicKeyUrl = 'https://publickey.story-test.com/'; keyName = 'publicTest'; }
const publicKeyPath = path.join(__dirname, '..', '..', '..', 'publicKeys', keyName);

/**
 *
 * @param {null|string}authorization
 * @returns {string}
 */
const parseAuthorization = (authorization) => {
    if (!authorization) { return ''; }
    const parsedAuthorization = authorization.split(' ').filter((i) => i !== ' ');
    if (parsedAuthorization[0] === '"Bearer"' || parsedAuthorization[0] === 'Bearer') {
        return parsedAuthorization[1];
    }
    throw new InvalidToken();
};

function decodePermissions (permissions) {
    return permissionHelper.decodeData(permissions);
}

const getScope = (token, scope = PERMISSION_SCOPE) => token.scopes.find((element) => element[0] === scope);

/**
 *
 * @param {string|null}publicKeyUrl
 * @returns {Promise<string>}
 */
async function getJwt (publicKeyUrl = _publicKeyUrl) {
    if (publicKeys[publicKeyUrl]) { return publicKeys[publicKeyUrl]; }
    if (_loadPublicKeyFromFile) { return fs.readFileSync(publicKeyPath).toString(); }
    const publicKeyLoaded = fetch.text(publicKeyUrl);
    const timer = new Promise((resolve, reject) => setTimeout(reject, 5000));
    try {
        publicKeys[publicKeyUrl] = await Promise.race([publicKeyLoaded, timer]);
    } catch (err) {
        // eslint-disable-next-line no-console
        console.log(err);
        publicKeys[publicKeyUrl] = fs.readFileSync(publicKeyPath).toString();
    }
    return publicKeys[publicKeyUrl];
}

const validateJwt = async (jwtToken, url) => {
    const publicKey = await getJwt(url);
    const verifier = new JWTVerifier({ issuer: 'Storyous s.r.o.', algorithm: 'RS256', publicKey });
    let decodedToken;
    try {
        decodedToken = verifier.verifyAndDecodeToken(jwtToken);
    } catch (err) {
        if (err.message === 'error:0906D064:PEM routines:PEM_read_bio:bad base64 decode'
            || err.message === 'error:09091064:PEM routines:PEM_read_bio_ex:bad base64 decode'
            || err.message === 'PEM_read_bio_PUBKEY failed'
            || err.name === 'JsonWebTokenError') {
            throw new InvalidToken(err.reason);
        } else if (err.name === 'TokenExpiredError') {
            throw new ExpiredToken();
        } else {
            throw err;
        }
    }
    return decodedToken;
};

/**
 *
 * @param {string|null}publicKeyUrl
 * @returns {(function(*, *): Promise<void>)|*}
 */
exports.validateJwtTokenMiddleware = ({ publicKeyUrl = _publicKeyUrl } = {}) => async (ctx, next) => {
    const jwtToken = parseAuthorization(ctx.get('authorization'));
    ctx.state.jwtPayload = await validateJwt(jwtToken, publicKeyUrl);
    await next();
};

const validatePermissionRightsStrict = (tokenPermissions, permissions) => {
    const decodedPermissions = decodePermissions(tokenPermissions);
    permissions.every((index) => {
        if (!decodedPermissions[index]) {
            throw new NotSufficientPermissions(permissions);
        }
        return true;
    });
};

/**
 *
 * @param {number|number[]}permissions
 * @returns {(function(*, *): Promise<void>)|*}
 */
exports.validatePermissionRightsStrictMiddleWare = (permissions) => async (ctx, next) => {
    permissions = typeof permissions !== 'object' ? [permissions] : permissions;
    const tokenPermissions = getScope(ctx.state.jwtPayload, PERMISSION_SCOPE)[1];
    validatePermissionRightsStrict(tokenPermissions, permissions);
    await next();
};
/**
 *
 * @param {string}tokenPermissions
 * @param {number[]|number}permissions
 */
const validatePermissionRights = (tokenPermissions, permissions) => {
    const decodedPermissions = decodePermissions(tokenPermissions);
    const validPermission = permissions.find((i) => decodedPermissions[i]);
    if (!validPermission) {
        throw new NotSufficientPermissions(permissions);
    }
};
/**
 *
 * @param {number|number[]}permissions
 * @returns {(function(*, *): Promise<void>)|*}
 */
exports.validatePermissionRightsMiddleWare = (permissions) => async (ctx, next) => {
    permissions = typeof permissions !== 'object' ? [permissions] : permissions;
    const tokenPermissions = getScope(ctx.state.jwtPayload, PERMISSION_SCOPE)[1];
    validatePermissionRights(tokenPermissions, permissions);
    await next();
};

/**
 *
 * @param {string|null}publicKeyUrl
 * @param {boolean}loadPublicKeyFromFile
 * @returns {Promise<void>}
 */
exports.init = async function ({ publicKeyUrl = _publicKeyUrl, loadPublicKeyFromFile = false } = {}) {
    _loadPublicKeyFromFile = loadPublicKeyFromFile;
    await getJwt(publicKeyUrl);
    setInterval(async () => {
        try { publicKeys[publicKeyUrl] = await fetch.text(publicKeyUrl); } catch (err) {
            // eslint-disable-next-line no-console
            console.log(err);
        }
    }, 60 * 60 * 1000);
};

/**
 *
 * @param {string}tokenMerchantId
 * @param {string}uriMerchantId
 * @returns {void}
 */
const validateMerchant = (tokenMerchantId, uriMerchantId) => {
    if (tokenMerchantId !== uriMerchantId && tokenMerchantId !== '*') {
        throw new UserNotAuthorised(uriMerchantId);
    }
};

/**
 *
 * @param ctx
 * @param next
 * @returns {Promise<void>}
 */
exports.validateMerchantMidleware = async (ctx, next) => {
    const { jwtPayload } = ctx.state.jwtPayload;
    const permisisonScope = getScope(jwtPayload, PERMISSION_SCOPE);
    const tokenMerchantId = permisisonScope[2].merchantId;
    const uriMerchantId = ctx.params.merchantId;
    validateMerchant(tokenMerchantId, uriMerchantId);
    await next();
};

/**
 *
 * @param {string}token
 * @param {string}merchant
 * @param {number[]|number}permissions
 * @param { {string|undefined} }
 * @returns {Promise<void>}
 */
exports.authorizeUser = async function (token, merchant, permissions, { publicKeyUrl = _publicKeyUrl } = {}) {
    const payload = await validateJwt(token, publicKeyUrl);
    const permisisonScope = getScope(payload, PERMISSION_SCOPE);
    const tokenPermissions = permisisonScope[1];
    const tokenMerchantId = permisisonScope[2].merchantId;

    validateMerchant(tokenMerchantId, merchant);
    validatePermissionRights(tokenPermissions, permissions);
};
