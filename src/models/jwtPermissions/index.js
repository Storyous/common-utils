'use strict';
const { JWTVerifier } = require('@storyous/storyous-jwt');
const fs = require('fs');
const path = require('path');

// eslint-disable-next-line import/no-unresolved
const { permissionHelper, fetch } = require('../../index');
const { NotSufficientPermissions } = require('./customErrors');
const { isProduction, isTesting } = require('../../config');

const publicKeys = {};
let _publicKeyUrl;
let keyName;
if (isProduction()) { _publicKeyUrl = 'http://publickey.storyous.com'; keyName = 'publicProduction'; } else if (isTesting()) {
    _publicKeyUrl = 'http://127.0.0.1:3010/getPublicKey'; keyName = 'publicTesting';
} else { _publicKeyUrl = 'http://publickey.storyous.com'; keyName = 'publicTest'; }
const publicKeyPath = path.join(__dirname, '..', '..', '..', 'publicKeys', keyName);

/**
 *
 * @param {null|string}authorization
 * @returns {string}
 */
const parseAuthorization = (authorization) => {
    if (!authorization) { return ''; }
    const parsedAuthorization = authorization.split(' ').filter((i) => i !== ' ');
    return parsedAuthorization[1];
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
async function getJwt (publicKeyUrl = null) {
    if (publicKeys[publicKeyUrl]) { return publicKeys[publicKeyUrl]; }
    const publicKeyLocal = new Promise((resolve) => {
        setTimeout(resolve, 5000, fs.readFileSync(publicKeyPath).toString());
    });
    const publicKeyLoaded = fetch.text(publicKeyUrl);

    publicKeys[publicKeyUrl] = await Promise.race([publicKeyLocal, publicKeyLoaded]);
    return publicKeys[publicKeyUrl];
}

/**
 *
 * @param {string|null}publicKeyUrl
 * @returns {(function(*, *): Promise<void>)|*}
 */
exports.validateJwtWithPermissions = ({ publicKeyUrl = null }) => async (ctx, next) => {
    if (!publicKeyUrl) publicKeyUrl = _publicKeyUrl;
    const publicKey = await getJwt(publicKeyUrl);
    const jwtToken = parseAuthorization(ctx.get('authorization'));
    const verifier = new JWTVerifier({ issuer: 'Storyous s.r.o.', algorithm: 'RS256', publicKey });
    const decodedToken = decodePayload(verifier.verifyAndDecodeToken(jwtToken));
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
    let isValid = false;
    permissions.every((index) => {
        if (tokenPermissions[index]) {
            isValid = true;
            return false;
        } return true;
    });
    if (!isValid) {
        throw new NotSufficientPermissions(permissions);
    } else { await next(); }
};

/**
 *
 * @param {string|null}publicKeyUrl
 * @returns {Promise<void>}
 */
exports.init = async function ({ publicKeyUrl = null }) {
    if (publicKeyUrl) _publicKeyUrl = publicKeyUrl;
    await getJwt(publicKeyUrl);
    setInterval(async () => {
        publicKeys[publicKeyUrl] = await fetch.text(publicKeyUrl);
    }, 60 * 60 * 1000);
};
