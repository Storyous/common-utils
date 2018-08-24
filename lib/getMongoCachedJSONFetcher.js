'use strict';

const fetch = require('node-fetch');
const AppError = require('./appError');
const { Collection } = require('mongodb');
const assert = require('assert');

const doFetch = async (jsonUrl, options) => {

    const result = await fetch(jsonUrl, options);

    if (!result.ok) {
        let textBody = null;
        try {
            textBody = await result.text();
        } catch (e) { // eslint-disable-line no-empty-block
        }

        throw AppError.internal(`URL fetch fail: ${jsonUrl}`, {
            fetchResponse: {
                status: result.status,
                body: textBody
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
 * @param {{ cacheLifetime: number, fetchOptions: Object }} options
 * @throws Error
 * @returns {mongoCachedJSONFetcher}
 */
module.exports = (jsonUrl, collection, { cacheLifetime = 10000, fetchOptions = {} }) => {

    assert(typeof jsonUrl === 'string', 'The jsonUrl param has to be valid url string.');
    assert(collection instanceof Collection, 'The collection has to be instance of mongodb.Collection.');

    return async (throwTooOldCache = false) => {

        const cachedFile = await collection.findOne({ _id: jsonUrl });

        if (cachedFile && cachedFile.fetchedAt >= new Date(Date.now() - cacheLifetime)) {
            return cachedFile.content;
        }

        try {
            const fetchResult = await doFetch(jsonUrl, fetchOptions);

            await collection.updateOne(
                { _id: jsonUrl },
                {
                    content: fetchResult,
                    fetchedAt: new Date()
                },
                { upsert: true }
            );

            return fetchResult;

        } catch (err) {

            if (throwTooOldCache) {
                err.message = `No fresh JSON content available. ${err.message}`;
                throw err;
            }

            if (!cachedFile) {
                throw err;
            }

            return cachedFile.content;
        }
    };
};
