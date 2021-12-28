'use strict';

const { Collection } = require('mongodb');
const assert = require('assert');
const { cloneDeep, once, get } = require('lodash');
const crypto = require('crypto');
const fetch = require('./fetch');
const AppError = require('./appError');

const calculateETagByText = (responseText) => {
    // sha1-base64 is the fastest
    // see https://medium.com/@chris_72272/what-is-the-fastest-node-js-hashing-algorithm-c15c1a0e164e
    const hash = crypto.createHash('sha1').update(responseText).digest('base64');
    return `W/"${hash}"`;
};

const doFetch = async (jsonUrl, etag, fetchFunction, fetchOptions) => {

    let headers = fetchOptions.headers || {};
    if (etag) {
        headers = { 'If-None-Match': etag, ...headers };
    }

    const finalFetchOptions = {
        timeout: 20000,
        ...fetchOptions,
        headers
    };

    try {
        const response = await fetchFunction(jsonUrl, finalFetchOptions);

        const responseText = await response.text();

        const newEtag = response.headers.get('etag') || calculateETagByText(responseText);

        const notModified = !!etag && (response.status === 304 || etag === newEtag);

        return {
            notModified,
            newEtag,
            newContent: notModified ? null : JSON.parse(responseText)
        };

    } catch (error) {

        if (etag && get(error, 'meta.response.status') === 304) {
            return { notModified: true, newEtag: etag, newContent: null };
        }

        throw error;
    }
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

const isYoungEnough = (fetchedAt, freshnessLimitDate) => fetchedAt >= freshnessLimitDate;

/**
 * @param {CacheConfig} cacheConfig
 * @param {string} key
 * @param {string} url
 * @returns {function(...[*]=)}
 */
const getKeyResolver = (cacheConfig, key, url) => {

    const refreshRecord = once(async () => {

        const freshnessLimitDate = new Date(Date.now() - cacheConfig.cacheLifetime);
        let notModified = false;

        // find meta only, we don't want to hold potentially large data in memory during the fetch
        const meta = {
            record: await findRecord(cacheConfig.collection, key, metaProjection),
            fetchOptions: cacheConfig.fetchOptions
        };
        const metaRecord = meta.record;

        const refreshPromise = (async () => {
            if (metaRecord && isYoungEnough(metaRecord.fetchedAt, freshnessLimitDate)) {
                return meta;
            }

            try {
                const etag = metaRecord && metaRecord.etag;
                const fetchResult = await doFetch(url, etag, cacheConfig.fetchFunction, cacheConfig.fetchOptions);
                const { newContent, newEtag } = fetchResult;
                ({ notModified } = fetchResult);

                const fetchedAt = new Date();

                if (notModified) {

                    if (cacheConfig.cacheLifetime <= 0) {
                        // optimization - no need to update the 'fetchedAt' field
                        return meta;
                    }

                    const {
                        value: newMeta,
                        lastErrorObject: { updatedExisting }
                    } = await cacheConfig.collection.findOneAndUpdate(
                        { _id: key, fetchedAt: metaRecord.fetchedAt },
                        { $set: { fetchedAt } },
                        { returnOriginal: false, projection: metaProjection }
                    );

                    if (!updatedExisting) {
                        // concurrency occurred - another fetcher/process updated the record in the meanwhile
                        return findRecordOrThrow(cacheConfig.collection, key, metaProjection);
                    }

                    return newMeta;
                }

                const finalContent = await cacheConfig.transform(newContent, key);

                const record = { content: finalContent, etag: newEtag, fetchedAt };

                await cacheConfig.collection.replaceOne({ _id: key }, record, { upsert: true });

                return record;

            } catch (e) {
                cacheConfig.logError(e);
                if (!metaRecord) {
                    throw e;
                }
                return meta;
            }

        })();

        const refreshResult = await new Promise((resolve, reject) => {

            const timeoutId = setTimeout(() => {
                cacheConfig.logError(new AppError('Loading of the content timed out.', meta));
                if (!metaRecord) {
                    reject(new Error('Cache refresh timed-out and there is no cached version to serve yet.'));
                }
                resolve(metaRecord);
            }, cacheConfig.timeout);

            refreshPromise
                .then(resolve, reject)
                .finally(() => clearTimeout(timeoutId));
        });

        return {
            meta: {
                isCacheFresh: notModified || isYoungEnough(refreshResult.fetchedAt, freshnessLimitDate),
                etag: refreshResult.etag
            },
            getFull: once(async () => {
                const fullRecord = 'content' in refreshResult
                    ? refreshResult
                    : await findRecordOrThrow(cacheConfig.collection, key);
                return {
                    isCacheFresh: notModified || isYoungEnough(fullRecord.fetchedAt, freshnessLimitDate),
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
 *     fetchFunction: Function
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
 * @param {Function} [fetchFunction]
 * @param {Object} [fetchOptions]
 * @param {Function} [transform]
 * @param {boolean} [ensureIndexes=true]
 * @param {function} [logError]
 * @throws Error
 */
module.exports = async (collection, {
    url: defaultUrl = null,
    fetchOptions: defaultFetchOptions = {},
    fetchFunction = fetch,
    cacheLifetime = -1, // every call will cause fetch fresh data by default, the cache is only fallback
    transform = (content, key) => content, // eslint-disable-line no-unused-vars
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
    const defaultCacheConfig = {
        collection,
        fetchFunction,
        fetchOptions: defaultFetchOptions,
        cacheLifetime,
        transform,
        logError,
        timeout
    };

    // the map helps to handle concurrent cache access in optimal way,
    // there's no need to process the same key (url) multiple times
    const runningKeyResolvers = new Map();

    return async ({
        url = defaultUrl,
        key = url,
        fetchOptions = null,
        ifNoneMatch = null,
        metaOnly = false
    } = {}) => {

        let runningResolver = runningKeyResolvers.get(key);

        if (!runningResolver) {

            const cacheConfig = fetchOptions
                ? { ...defaultCacheConfig, fetchOptions }
                : defaultCacheConfig;

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
