'use strict';

const assert = require('assert');
const sinon = require('sinon');
const { it, describe, beforeEach } = require('mocha');
const { times, pick } = require('lodash');
const getMongoLocker = require('../lib/getMongoLocker');
const getMongoClient = require('./getMongoClient');

describe('getMongoLocker', () => {

    let mongoClient;
    const collectionName = 'locks';
    let collection;

    beforeEach(async () => {
        mongoClient = await getMongoClient();
        collection = mongoClient.db()
            .collection(collectionName);
        try {
            await collection.drop();
        } catch (e) {
        } // eslint-disable-line no-empty
    });

    it('should acquire and release a lock', async () => {

        let i = 0;
        const callback = sinon.spy(() => ++i);

        const locker = await getMongoLocker(collection);

        const result1 = await locker('AAA', callback);
        assert.strictEqual(result1, 1);

        const result2 = await locker('AAA', callback);
        assert.strictEqual(result2, 2);

        assert.deepStrictEqual(callback.callCount, 2);
    });

    it('should not be possible to acquire the lock twice at once', async () => {

        const locker = await getMongoLocker(collection);

        const callback = sinon.spy(() => new Promise((resolve) => setTimeout(resolve, 50)));

        const callLocker = () => locker('AAA', callback, { noLaterThan: 0 });

        const concurrency = 10;
        const promises = times(concurrency, callLocker);

        // Node 10 or less does not support allSettled. Going through good old cycle in such case
        if (Promise.allSettled) {
            await Promise.allSettled(promises); // just to get rid of UnhandledRejectionErrors
        } else {
            // just to get rid of UnhandledRejectionErrors
            promises.forEach((promise) => promise.catch(() => {}));

            for (let i = 0; i < promises.length; i++) {
                try {
                    await promises[i]; // eslint-disable-line
                } catch (err) {
                    // Thats ok, we expect there can be errors
                }
            }
        }

        const stats = {
            resolved: 0,
            failed: 0
        };

        for (const promise of promises) {
            try {
                await promise; // eslint-disable-line no-await-in-loop
                stats.resolved++;
            } catch (err) {
                assert(/The lock is already acquired./.test(err.message));
                stats.failed++;
            }
        }

        assert.deepStrictEqual(callback.callCount, 1, 'The callback should be called only once');
        assert.deepStrictEqual(stats, {
            resolved: 1,
            failed: concurrency - 1
        });
    });

    it('should propagate an error and release the lock if the callback fails', async () => {
        const locker = await getMongoLocker(collection);

        await assert.rejects(() => locker('AAA', async () => {
            throw new Error('Some error occurred');
        }), /Some error occurred/);

        const callback = sinon.spy();
        await locker('AAA', callback);

        assert.strictEqual(callback.callCount, 1);
    });

    it('should be able to handle few concurrent tasks by waiting some time and acquire retries', async () => {
        const locker = await getMongoLocker(collection);
        const callTimes = [];
        const callback = sinon.spy(async () => {
            callTimes.push(new Date());
            await new Promise((resolve) => setTimeout(resolve, 150));
            callTimes.push(new Date());
        }); // default retryDelay is 200

        const callLocker = () => locker('AAA', callback);

        await Promise.all(times(3, callLocker));

        assert.strictEqual(callback.callCount, 3);
        callTimes.forEach((time, i) => {
            if (i > 0) {
                assert(time > callTimes[i - 1], 'There was a parallel callback execution!');
            }
        });
    });

    it('should create and TTL index on the right field', async () => {

        await mongoClient.db()
            .createCollection(collectionName);

        let indexes = await collection.indexes();
        assert.deepStrictEqual(indexes.length, 1); // ensure there is only mandatory _id index

        const locker = await getMongoLocker(collection);
        indexes = await collection.indexes();
        assert.deepStrictEqual(indexes.length, 2, 'No or wrong indexes has been created!');
        assert.deepStrictEqual(pick(indexes[1], 'key', 'expireAfterSeconds'), {
            expireAfterSeconds: 120,
            key: {
                acquiredAt: 1
            }
        }, 'No or wrong indexes has been created!');


        const startedAt = new Date();
        const someKey = 'someKey';
        await locker(someKey, async () => {
            const document = await collection.findOne({});
            assert.strictEqual(document._id, someKey);
            assert(document.acquiredAt >= startedAt, 'The acquiredAt property has to be greater then startedAt');
            assert(document.acquiredAt < new Date(), 'The acquiredAt property has to be younger then present');
        });

    });

});
