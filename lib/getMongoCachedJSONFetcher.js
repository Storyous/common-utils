'use strict';

const fetch = require('node-fetch');
const AppError = require('./appError');
const { Collection } = require('mongodb');
const assert = require('assert');
const { cloneDeep } = require('lodash');

class NoOrOldCacheError extends Error {

    constructor (originalError, hasContent, oldContent) {

        const message = 'No fresh JSON content available.';
        originalError.message = `${message} ${originalError.message}`;
        super(message);

        this.originalError = originalError;

        this.hasOldContent = hasContent;

        this.oldContent = oldContent;
    }
}


const doFetch = async (jsonUrl, options) => {

    const result = await fetch(jsonUrl, options);

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
 * @returns {Promise<{
 *     content: *|undefined,
 *     error: Error|null
 * }>}
 */
const get = async (jsonUrl, collection, { cacheLifetime, fetchOptions, transform }) => {

    const cachedFile = await collection.findOne({ _id: jsonUrl });

    if (cachedFile && cachedFile.fetchedAt >= new Date(Date.now() - cacheLifetime)) {
        return cachedFile.content;
    }

    try {
        let fetchResult = await doFetch(jsonUrl, fetchOptions);

        fetchResult = await transform(fetchResult);

        await collection.replaceOne(
            { _id: jsonUrl },
            {
                content: fetchResult,
                fetchedAt: new Date()
            },
            { upsert: true }
        );

        return fetchResult;

    } catch (err) {
        throw new NoOrOldCacheError(err, !!cachedFile, cachedFile && cachedFile.content);
    }

};


/**
 * @callback mongoCachedJSONFetcher
 * @param {boolean} [throwTooOldCache=false]
 * @throws Error
 * @returns {Promise.<Object>}
 */

/**
 * @param {string} jsonUrl
 * @param {Collection} collection
 * @param {{ cacheLifetime?: number, fetchOptions?: Object, transform?: Function }} options
 * @throws Error
 * @returns {mongoCachedJSONFetcher}
 */
module.exports = (jsonUrl, collection, { cacheLifetime = 10000, fetchOptions = {}, transform = val => val }) => {

    assert(typeof jsonUrl === 'string', 'The jsonUrl param has to be valid url string.');
    assert(collection instanceof Collection, 'The collection has to be instance of mongodb.Collection.');
    assert(typeof transform === 'function', 'The transform param has to be function');

    let currentPromise = null;

    return async (throwTooOldCache = false) => {

        const isConcurrent = !!currentPromise;

        if (!isConcurrent) {
            currentPromise = get(jsonUrl, collection, { cacheLifetime, fetchOptions, transform })
                .finally(() => {
                    currentPromise = null;
                });
        }

        let result;

        try {
            result = await currentPromise;

        } catch (err) {

            if (!(err instanceof NoOrOldCacheError)) {
                throw err;
            }

            if (!err.hasOldContent || throwTooOldCache) {
                throw err.originalError;
            }

            result = err.oldContent;
        }

        return isConcurrent ? cloneDeep(result) : result;
    };
};
