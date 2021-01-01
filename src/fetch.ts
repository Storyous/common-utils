'use strict';

import nodeFetch, { RequestInit, Response } from 'node-fetch';
import { omitBy, isUndefined } from 'lodash';
const AppError = require('./appError');

type EnrichedRequestOptions = RequestInit & {
    expectOk?: boolean,
    parseResponseAs?: 'json'|'text',
};

const omitUndefined = (object: Object) => omitBy(object, isUndefined);

const errorWith = (error: Error, originalStack: string, url: string, options: RequestInit, response?: Response, responseText?: string) => {

    let err = error instanceof AppError
        ? error
        : new AppError(error.message);

    err.setMeta(omitUndefined({
        request: omitUndefined({ url, method: options.method || 'GET', body: options.body }),
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
 * Returns Response object or parsed body value if parseResponseAs is specified
 */
async function fetch (url: string, options: EnrichedRequestOptions = {}): Promise<Response|string|any> {

    const {
        expectOk = true,
        parseResponseAs,
        ...fetchOptions
    } = options;

    if (![undefined, 'json', 'text'].includes(parseResponseAs)) {
        throw new Error('Invalid parseResponse option.');
    }

    const originalStack = new Error().stack!;

    let response;

    try {
        response = await nodeFetch(url, fetchOptions);

    } catch (error) {
        throw errorWith(error, originalStack, url, options);
    }

    if (expectOk && !response.ok) {
        const responseText = await response.text().catch((err) => `RESPONSE BODY NOT PARSABLE: ${err}`);
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
fetch.json = async (url: string, options: RequestInit) => fetch(url, {
    ...options,
    parseResponseAs: 'json'
});

/**
 * @param {string} url
 * @param {Object} [options]
 * @returns {Promise} Returns parsed text body
 */
fetch.text = async (url: string, options: RequestInit) => fetch(url, {
    ...options,
    parseResponseAs: 'text'
});

module.exports = fetch;
