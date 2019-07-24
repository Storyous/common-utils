'use strict';

const fetch = require('node-fetch');
const AppError = require('./appError');
const { Collection } = require('mongodb');
const assert = require('assert');
const { cloneDeep } = require('lodash');

class NoOrExpiredCacheError extends Error {

    constructor (originalError, hasExpiredContent, expiredContent) {

        const message = 'No fresh JSON content available.';
        originalError.message = `${message} ${originalError.message}`;
        super(message);

        this.originalError = originalError;

        this.hasExpiredContent = hasExpiredContent;

        this.expiredContent = expiredContent;
    }
}


const doFetch = async (jsonUrl, options) => {

    const fetchOptions = Object.assign({
        timeout: 20000
    }, options);

    const result = await fetch(jsonUrl, fetchOptions);

    if (!result.ok) {
        throw AppError.internal(`URL fetch fail: ${jsonUrl}`, {
            response: {
                status: result.status,
                body: await result.text()
            }
        });
    }

    return result.json();
};

/**
 * @param jsonUrl
 * @param collection
 * @param cacheLifetime
 * @param fetchOptions
 * @param transform
 * @param timeout
 * @returns {Promise.<*>}
 */

const get = async (
    jsonUrl,
    collection,
    {
        cacheLifetime = 10000,
        fetchOptions = {},
        transform = val => val,
        timeout = 2000
    }
) => {

    const cachedFile = await collection.findOne({ _id: jsonUrl });

    if (cachedFile && cachedFile.fetchedAt >= new Date(Date.now() - cacheLifetime)) {
        return cachedFile.content;
    }

    const constructError = err => new NoOrExpiredCacheError(err, !!cachedFile, cachedFile && cachedFile.content);

    return new Promise(async (resolve, reject) => {

        const timeoutId = setTimeout(() => {
            reject(constructError(new Error('Loading of the content timed out.')));
        }, timeout);

        try {
            let fetchResult = await doFetch(jsonUrl, fetchOptions);

            fetchResult = await transform(fetchResult);

            await collection.replaceOne(
                { _id: jsonUrl },
                { content: fetchResult, fetchedAt: new Date() },
                { upsert: true }
            );

            resolve(fetchResult);

        } catch (err) {
            reject(constructError(err));

        } finally {
            clearTimeout(timeoutId);
        }
    });
};


/**
 * @callback mongoCachedJSONFetcher
 * @param {boolean} [throwExpiredCache=false]
 * @throws Error
 * @returns {Promise.<Object>}
 */

/**
 * @param {string} jsonUrl
 * @param {Collection} collection
 * @param {{ cacheLifetime?: number, fetchOptions?: Object, transform?: Function, timeout?: number }} options
 * @throws Error
 * @returns {mongoCachedJSONFetcher}
 */
module.exports = (jsonUrl, collection, options = {}) => {

    assert(typeof jsonUrl === 'string', 'The jsonUrl param has to be valid url string.');
    assert(collection instanceof Collection, 'The collection has to be instance of mongodb.Collection.');
    if ('transform' in options) {
        assert(typeof options.transform === 'function', 'The transform param has to be function');
    }

    let currentPromise = null;

    return async (throwExpiredCache = false) => {

        const isConcurrent = !!currentPromise;

        if (!isConcurrent) {
            currentPromise = get(jsonUrl, collection, options).finally(() => {
                currentPromise = null;
            });
        }

        let result;

        try {
            result = await currentPromise;

        } catch (err) {

            if (!(err instanceof NoOrExpiredCacheError)) {
                throw err;
            }

            if (!err.hasExpiredContent || throwExpiredCache) {
                throw err.originalError;
            }

            result = err.expiredContent;
        }

        return isConcurrent ? cloneDeep(result) : result;
    };
};
