'use strict';

const fetch = require('node-fetch');
const { Collection } = require('mongodb');
const assert = require('assert');
const { cloneDeep, once } = require('lodash');
const crypto = require('crypto');
const AppError = require('./appError');

const calculateETagByText = (responseText) => {
    // sha1-base64 is the fastest
    // see https://medium.com/@chris_72272/what-is-the-fastest-node-js-hashing-algorithm-c15c1a0e164e
    const hash = crypto.createHash('sha1').update(responseText).digest('base64');
    return `W/"${hash}"`;
};

const doFetch = async (jsonUrl, etag, options) => {

    let headers = options.headers || {};
    if (etag) {
        headers = { 'If-None-Match': etag, ...headers };
    }

    const fetchOptions = {
        timeout: 20000,
        ...options,
        headers
    };

    const response = await fetch(jsonUrl, fetchOptions);

    if (!response.ok && response.status !== 304) {
        throw AppError.internal(`URL fetch fail: ${jsonUrl}`, {
            response: {
                status: response.status,
                body: await response.text()
            }
        });
    }

    const responseText = await response.text();

    const newEtag = response.headers.get('etag') || calculateETagByText(responseText);

    const notModified = etag && (response.status === 304 || etag === newEtag);

    return {
        notModified,
        newEtag,
        newContent: notModified ? null : JSON.parse(responseText)
    };
};

const metaProjection = { fetchedAt: true, etag: true };

/**
 * @param {Collection} collection
 * @param {string} key
 * @param {Object} [projection]
 */
const findRecord = async (collection, key, projection) => (
    collection.findOne({ _id: key }, { projection })
);

/**
 * @param {Collection} collection
 * @param {string} key
 * @param {Object} [projection]
 */
const findRecordOrThrow = async (collection, key, projection) => {
    const record = await findRecord(collection, key, projection);
    if (!record) {
        throw AppError.internal('Missing record for key.');
    }
    return record;
};

const isCacheFresh = (fetchedAt, freshnessLimitDate) => fetchedAt >= freshnessLimitDate;


/**
 * @param {CacheConfig} cacheConfig
 * @param {string} key
 * @param {string} url
 * @returns {function(...[*]=)}
 */
const getKeyResolver = (cacheConfig, key, url) => {

    const refreshRecord = once(async () => {

        const freshnessLimitDate = new Date(Date.now() - cacheConfig.cacheLifetime);

        // find meta only, we don't want to hold potentially large data in memory during the fetch
        const meta = await findRecord(cacheConfig.collection, key, metaProjection);

        const refreshPromise = (async () => {

            if (meta && isCacheFresh(meta.fetchedAt, freshnessLimitDate)) {
                return meta;
            }

            try {
                const etag = meta && meta.etag;
                const { notModified, newContent, newEtag } = await doFetch(url, etag, cacheConfig.fetchOptions);

                if (notModified) {
                    const {
                        value: newMeta,
                        lastErrorObject: { updatedExisting }
                    } = await cacheConfig.collection.findOneAndUpdate(
                        { _id: key, fetchedAt: meta.fetchedAt },
                        { $set: { fetchedAt: new Date() } },
                        { returnOriginal: false, projection: metaProjection }
                    );

                    if (!updatedExisting) {
                        // concurrency occurred - another fetcher/process updated the record in the meanwhile
                        return findRecordOrThrow(cacheConfig.collection, key, metaProjection);
                    }

                    return newMeta;
                }

                const finalContent = await cacheConfig.transform(newContent, key);

                const record = { content: finalContent, etag: newEtag, fetchedAt: new Date() };

                await cacheConfig.collection.replaceOne({ _id: key }, record, { upsert: true });

                return record;

            } catch (e) {
                cacheConfig.logError(e);
                if (!meta) {
                    throw e;
                }
                return meta;
            }

        })();

        const refreshResult = await new Promise((resolve, reject) => {

            const timeoutId = setTimeout(() => {
                cacheConfig.logError(new Error('Loading of the content timed out.'));
                if (!meta) {
                    reject(new Error('Cache refresh timed-out and there is no cached version to serve yet.'));
                }
                resolve(meta);
            }, cacheConfig.timeout);

            refreshPromise
                .then(resolve, reject)
                .finally(() => clearTimeout(timeoutId));
        });


        return {
            meta: {
                isCacheFresh: isCacheFresh(refreshResult.fetchedAt, freshnessLimitDate),
                etag: refreshResult.etag
            },
            getFull: once(async () => {
                const fullRecord = 'content' in refreshResult
                    ? refreshResult
                    : await findRecordOrThrow(cacheConfig.collection, key);
                return {
                    isCacheFresh: isCacheFresh(fullRecord.fetchedAt, freshnessLimitDate),
                    etag: fullRecord.etag,
                    content: fullRecord.content
                };
            })
        };
    });

    return async ({ ifNoneMatch, metaOnly }) => {

        const result = await refreshRecord();

        let etagMatch = !!(ifNoneMatch && ifNoneMatch === result.meta.etag);

        if (metaOnly || etagMatch) {
            // no need to load content from the DB
            return {
                isCacheFresh: result.meta.isCacheFresh,
                etag: result.meta.etag,
                etagMatch,
                content: null
            };
        }

        const full = await result.getFull();
        etagMatch = !!(ifNoneMatch && ifNoneMatch === full.etag);

        return {
            isCacheFresh: full.isCacheFresh,
            etag: full.etag,
            etagMatch,
            content: etagMatch ? null : full.content
        };
    };
};

/**
 * @typedef {{
 *     collection: Collection
 *     fetchOptions: Object
 *     cacheLifetime: number
 *     transform: Function
 *     logError: Function
 *     timeout: number
 * }} CacheConfig
 */

/**
 * @param {Collection} collection
 * @param {string} [url]
 * @param {number} [cacheLifetime]
 * @param {Object} [fetchOptions]
 * @param {Function} [transform]
 * @param {boolean} [ensureIndexes=true]
 * @param {function} [logError]
 * @throws Error
 */
module.exports = async (collection, {
    url: defaultUrl = null,
    fetchOptions = {},
    cacheLifetime = -1, // every call will cause fetch fresh data by default, the cache is only fallback
    transform = (content) => content,
    ensureIndexes = true,
    logError = () => {},
    timeout = 2000
} = {}) => {

    assert(collection instanceof Collection, 'The collection has to be instance of mongodb.Collection.');

    if (ensureIndexes) {
        // ensure index to enable covered queries
        // the collection.createIndex will perform the index creation only if the index is missing
        await collection.createIndex({ _id: 1, fetchedAt: 1, etag: 1 });
    }

    /** @type {CacheConfig} */
    const cacheConfig = {
        collection, fetchOptions, cacheLifetime, transform, logError, timeout
    };

    // the map helps to handle concurrent cache access in optimal way,
    // there's no need to process the same key (url) multiple times
    const runningKeyResolvers = new Map();

    return async ({
        url = defaultUrl,
        key = url,
        ifNoneMatch = null,
        metaOnly = false
    } = {}) => {

        let runningResolver = runningKeyResolvers.get(key);

        if (!runningResolver) {
            runningResolver = {
                resolve: getKeyResolver(cacheConfig, key, url),
                concurrentRuns: 1
            };
            runningKeyResolvers.set(key, runningResolver);
        } else {
            runningResolver.concurrentRuns++;
        }

        try {
            const resolved = await runningResolver.resolve({ ifNoneMatch, metaOnly });

            return runningResolver.concurrentRuns === 1
                ? resolved
                : cloneDeep(resolved);

        } finally {
            // let's
            if (--runningResolver.concurrentRuns === 0) {
                runningKeyResolvers.delete(key);
            }
        }
    };
};
