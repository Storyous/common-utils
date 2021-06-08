import { defaultsDeep, get } from 'lodash';
import mongoLocker from './mongoLocker';
import appData from './models/appData';
const fetch = require('./fetch');
import { RequestInit as OriginalRequestInit } from 'node-fetch';


async function _fetchFreshToken (timeout: number, loginUrl: string, clientId: string, clientSecret: string) {
    return fetch.json(`${loginUrl}/api/auth/authorize`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: 'client_credentials',
        }),
        timeout,
    });
}

async function _getToken (invalidToken: string|null, loginUrl: string, clientId: string, clientSecret: string) {
    const timeout = 20000;
    const accessTokenDocumentId = 'storyousApiAccessToken';

    return mongoLocker('getStoryousAccessTokenLock', async () => {
        const expireLimit = new Date();
        expireLimit.setMinutes(expireLimit.getMinutes() + 5);

        let document = await appData.getDocument(accessTokenDocumentId);

        if (!document || document.expiresAt < expireLimit || document.accessToken === invalidToken) {
            const { access_token: accessToken, expires_at: expiresAt } = await _fetchFreshToken(timeout, loginUrl, clientId, clientSecret);
            document = { accessToken, expiresAt: new Date(expiresAt) };
            await appData.updateDocument(accessTokenDocumentId, { $set: document }, true);
        }

        return document.accessToken;

    }, { noLaterThan: 2000, expireIn: timeout + 2000 });
}

interface RequestInit extends OriginalRequestInit {
    loginUrl: string,
    clientId: string,
    clientSecret: string,
    parseJsonAs?: 'json'|'text',
    expectOk?: boolean
}

export default async function storyousAuthorizedFetch (url: string, { loginUrl, clientId, clientSecret, ...fetchOptions }: RequestInit) {

    const doFetch = (accessToken: string) => (
        fetch(url, defaultsDeep({ headers: { Authorization: `Bearer ${accessToken}` } }, fetchOptions))
    );

    const accessToken = await _getToken(null, loginUrl, clientId, clientSecret);
    try {
        return await doFetch(accessToken);
    } catch (error) {
        if ([401, 403].includes(get(error, 'meta.response.status'))) {
            const refreshedAccessToken = await _getToken(accessToken, loginUrl, clientId, clientSecret);
            return doFetch(refreshedAccessToken);
        }
        throw error;
    }

}
