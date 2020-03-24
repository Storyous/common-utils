'use strict';

const getTestDatabase = require('./getTestDatabase');
const getMongoLocker = require('../lib/getMongoLocker');
const assert = require('assert');
const sinon = require('sinon');
const { it, describe, beforeEach } = require('mocha');
const { times, pick } = require('lodash');

describe('getMongoLocker', () => {

    let db;
    const collectionName = 'locks';
    let collection;

    beforeEach(async () => {
        db = await getTestDatabase();
        collection = db.db.collection(collectionName);
        try {
            await collection.drop();
        } catch (e) {} // eslint-disable-line no-empty
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

        const callback = sinon.spy();

        const concurrency = 10;

        const promises = times(concurrency, () => locker('AAA', async () => {
            await new Promise(resolve => setTimeout(resolve, 50));
            callback();
        }));


        const stats = { resolved: 0, failed: 0 };

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
        assert.deepStrictEqual(stats, { resolved: 1, failed: concurrency - 1 });
    });

    it('should propagate an error and release the lock if the callback fails', async () => {
        const locker = await getMongoLocker(collection);

        await assert.rejects(locker('AAA', async () => {
            throw new Error('Some error occured');
        }), /Some error occured/);

        const callback = sinon.spy();
        await locker('AAA', callback);

        assert.strictEqual(callback.callCount, 1);
    });

    it('should create and TTL index on the right field', async () => {

        await db.db.createCollection(collectionName);

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
