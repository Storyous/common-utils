'use strict';
const { JWTVerifier } = require('@storyous/storyous-jwt');
const fs = require('fs');
const path = require('path');

// eslint-disable-next-line import/no-unresolved
const { permissionHelper, fetch } = require('../../index');
const { NotSufficientPermissions, InvalidToken, ExpiredToken } = require('./customErrors');
const config = require('../../config');

const publicKeys = {};
let _publicKeyUrl;
let keyName;
let _loadPublicKeyFromFile;

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

/**
 *
 * @param {object}payload
 * @returns {{decodedPayload: {merchantId:string, decodedPermissions: (boolean[])}, originalPayload}}
 */
function decodePayload (payload) {
    const { permissions, merchantId } = payload;
    const decodedPermissions = permissions ? permissionHelper.decodeData(permissions) : [];
    return { originalPayload: payload, decodedPayload: { merchantId, decodedPermissions } };

}

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

/**
 *
 * @param {string|null}publicKeyUrl
 * @returns {(function(*, *): Promise<void>)|*}
 */
exports.validateJwtWithPermissions = ({ publicKeyUrl = _publicKeyUrl }) => async (ctx, next) => {
    const publicKey = await getJwt(publicKeyUrl);
    const jwtToken = parseAuthorization(ctx.get('authorization'));
    const verifier = new JWTVerifier({ issuer: 'Storyous s.r.o.', algorithm: 'RS256', publicKey });
    let decodedToken;
    try { decodedToken = decodePayload(verifier.verifyAndDecodeToken(jwtToken)); } catch (err) {
        if (err.message === 'error:0906D064:PEM routines:PEM_read_bio:bad base64 decode'
            || err.message === 'error:09091064:PEM routines:PEM_read_bio_ex:bad base64 decode'
            || err.message === 'PEM_read_bio_PUBKEY failed'
            || err.name === 'JsonWebTokenError') {
            throw new InvalidToken(err.reason);
        } else if (err.name === 'TokenExpiredError') { throw new ExpiredToken(); } else { throw err; }
    }
    // PEM_read_bio_PUBKEY failed
    ctx.state.permissions = decodedToken.decodedPayload.decodedPermissions;
    ctx.state.jwtPayload = decodedToken;
    await next();
};

/**
 *
 * @param {number|number[]}permissions
 * @returns {(function(*, *): Promise<void>)|*}
 */
exports.checkPermissionRightsStrict = (permissions) => async (ctx, next) => {
    permissions = typeof permissions !== 'object' ? [permissions] : permissions;
    const tokenPermissions = ctx.state.permissions;
    permissions.every((index) => {
        if (!tokenPermissions[index]) {
            throw new NotSufficientPermissions(permissions);
        }
        return true;
    });
    await next();
};

/**
 *
 * @param {number|number[]}permissions
 * @returns {(function(*, *): Promise<void>)|*}
 */
exports.checkPermissionRights = (permissions) => async (ctx, next) => {
    permissions = typeof permissions !== 'object' ? [permissions] : permissions;
    const tokenPermissions = ctx.state.permissions || [];
    const validPermission = permissions.find((i) => tokenPermissions[i]);
    if (!validPermission) {
        throw new NotSufficientPermissions(permissions);
    } else { await next(); }
};

/**
 *
 * @param {string|null}publicKeyUrl
 * @returns {Promise<void>}
 */
exports.init = async function ({ publicKeyUrl = _publicKeyUrl, loadPublicKeyFromFile = null }) {
    _loadPublicKeyFromFile = loadPublicKeyFromFile;
    await getJwt(publicKeyUrl);
    setInterval(async () => {
        try { publicKeys[publicKeyUrl] = await fetch.text(publicKeyUrl); } catch (err) {
            // eslint-disable-next-line no-console
            console.log(err);
        }
    }, 60 * 60 * 1000);
};
