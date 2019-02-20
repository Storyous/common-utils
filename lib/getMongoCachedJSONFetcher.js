'use strict';

const fetch = require('node-fetch');
const AppError = require('./appError');
const { Collection } = require('mongodb');
const assert = require('assert');
const concurrentTask = require('./concurrentTask');

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

    return async (throwTooOldCache = false) => concurrentTask(async () => {

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

            if (err.name === 'MongoError' && err.code === 11000) {
                throw AppError.concurrentRequest();
            }

            if (throwTooOldCache) {
                err.message = `No fresh JSON content available. ${err.message}`;
                throw err;
            }

            if (!cachedFile) {
                throw err;
            }

            return cachedFile.content;
        }

    }, 3);
};
