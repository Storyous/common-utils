'use strict';

const nodeFetch = require('node-fetch');
const {
    omitBy,
    isUndefined
} = require('lodash');
const AppError = require('./appError');
const clsAdapter = require('./models/clsAdapter');

const omitUndefined = (object) => omitBy(object, isUndefined);

const errorWith = (error, originalStack, url, options, response, responseText) => {

    let err = error;
    if (!(err instanceof AppError)) {
        err = new AppError(err.message);
    }

    err.setMeta(omitUndefined({
        request: omitUndefined({
            url,
            method: options.method || 'GET',
            body: options.body
        }),
        response: response && {
            status: response.status,
            body: responseText
        }
    }));

    err.stack = [
        err.stack.split('\n')[0],
        ...originalStack.split('\n')
            .filter((line, i) => (i > 0 && !line.includes(__filename)))
    ].join('\n');

    return err;
};

/**
 * @param {string} url
 * @param {{
 *     expectOk?: boolean
 *     parseResponseAs?: 'json'|'text'
 * }} [options] - extended Fetch options
 * @returns {Promise.<nodeFetch.Response|string|*>}
 *
 * Returns Response object or parsed body value if parseResponseAs is specified
 */
async function fetch (url, options = {}) {
    const {
        expectOk = true,
        parseResponseAs,
        ...fetchOptions
    } = options;

    fetchOptions.headers = {
        'x-correlation-id': clsAdapter.getCorrelationId(),
        ...(fetchOptions.headers || {})
    };

    if (clsAdapter.getSessionId()) {
        fetchOptions.headers['x-session-id'] = clsAdapter.getSessionId();
    }

    if (![undefined, 'json', 'text'].includes(parseResponseAs)) {
        throw new Error('Invalid parseResponse option.');
    }

    const originalStack = new Error().stack;

    let response;

    try {
        response = await nodeFetch(url, fetchOptions);

    } catch (error) {
        throw errorWith(error, originalStack, url, options);
    }

    if (expectOk && !response.ok) {
        const responseText = await response.text()
            .catch((err) => `RESPONSE BODY NOT PARSABLE: ${err}`);
        throw errorWith(
            new Error(`Response status ${response.status} is not ok`),
            originalStack,
            url,
            options,
            response,
            responseText
        );
    }

    if (!parseResponseAs) {
        return response;
    }

    let responseText;
    try {
        responseText = await response.text();
    } catch (err) {
        throw errorWith(new Error('Response body is not parsable'), originalStack, url, options, response);
    }

    if (parseResponseAs === 'text') {
        return responseText;
    }

    try {
        return JSON.parse(responseText);
    } catch (error) {
        throw errorWith(new Error('Response is not valid JSON'), originalStack, url, options, response, responseText);
    }
}

/**
 * @param {string} url
 * @param {Object} [options]
 * @returns {Promise} Returns parsed JSON body
 */
fetch.json = async (url, options) => fetch(url, {
    ...options,
    parseResponseAs: 'json'
});

/**
 * @param {string} url
 * @param {Object} [options]
 * @returns {Promise} Returns parsed text body
 */
fetch.text = async (url, options) => fetch(url, {
    ...options,
    parseResponseAs: 'text'
});

module.exports = fetch;
