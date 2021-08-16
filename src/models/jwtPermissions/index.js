'use strict';
const { JWTVerifier, JWTIssuer } = require('@storyous/storyous-jwt');
const fs = require('fs');
const path = require('path');
// eslint-disable-next-line import/no-unresolved
const { permissionHelper, fetch } = require('../../index');
const { NotSufficientPermissions } = require('./customErrors');
const { isProduction, isTesting } = require('../../config');

const publicKeyPath = path.join(__dirname, '.', 'keys', 'public');

const publicKeys = {};


let _publicKeyUrl = 'http://127.0.0.1:3010/getPublicKey';
// if (isProduction()) { publicKeyUrl = 'http://publickey.storyous.com'; } else if (isTesting()) {
//     publicKeyUrl = 'http://127.0.0.1:3010/getPublicKey';
// } else { publicKeyUrl = 'http://publickey.storyous.com'; }


function decodePayload (payload) {
    const { permissions, merchantId } = payload;
    const decodedPermissions = permissions ? permissionHelper.decodeData(permissions) : [];
    return { originalPayload: payload, decodedPayload: { merchantId, decodedPermissions } };

}
async function getJwt (publicKeyUrl = null) {
    if (publicKeys[publicKeyUrl]) { return publicKeys[publicKeyUrl]; }
    const publicKeyLocal = new Promise((resolve) => {
        setTimeout(resolve, 5000, fs.readFileSync(publicKeyPath).toString());
    });
    const publicKeyLoaded = fetch.text(publicKeyUrl);

    publicKeys[publicKeyUrl] = await Promise.race([publicKeyLocal, publicKeyLoaded]);
    return publicKeys[publicKeyUrl];
}

exports.validateJwtWithPermissions = (jwtToken, { publicKeyUrl = null }) => async (ctx, next) => {
    if (publicKeyUrl) _publicKeyUrl = publicKeyUrl;
    const publicKey = await getJwt(_publicKeyUrl);
    const verifier = new JWTVerifier({ issuer: 'Storyous s.r.o.', algorithm: 'RS256', publicKey });
    const decodedToken = decodePayload(verifier.verifyAndDecodeToken(jwtToken));
    ctx.state.permissions = decodedToken.decodedPayload.decodedPermissions;
    ctx.state.jwtPayload = decodedToken;
    await next();
};


exports.jwtTokenSign = (payload, privateKey = null) => {
    if (!privateKey) {
        const privateKeyPath = path.join(__dirname, '.', 'keys', 'private');
        privateKey = fs.readFileSync(privateKeyPath).toString();
    }
    const issuer = new JWTIssuer({ issuer: 'Storyous s.r.o.', privateKey });
    return issuer.createToken(payload, []);
};

exports.checkPermissionRightsStrict = (permissions) => async (ctx, next) => {
    const tokenPermissions = ctx.state.permissions;
    permissions.every((index) => {
        if (!tokenPermissions[index]) {
            throw new NotSufficientPermissions(permissions);
        }
        return true;
    });
    await next();
};
exports.checkPermissionRights = (permissions) => async (ctx, next) => {
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

exports.init = async function ({ publicKeyUrl = null }) {
    if (publicKeyUrl) _publicKeyUrl = publicKeyUrl;
    await getJwt(publicKeyUrl);
    setInterval(async () => {
        publicKeys[publicKeyUrl] = await fetch.text(publicKeyUrl);
    }, 60 * 60 * 1000);
};
