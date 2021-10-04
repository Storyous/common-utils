'use strict';

const { describe, it, beforeEach } = require('mocha');
const assert = require('assert').strict;
require('./getMongoClient');
const { getCollection, withTransaction } = require('../lib');

describe('withTransaction', () => {

    let testCollection;
    beforeEach(async () => {
        testCollection = getCollection('withTransactionTests');
        await testCollection.insertOne({}); // ensure the collection is created before tests
        await testCollection.removeMany();
    });

    it('should commit the transaction', async () => {

        const expectedReturnValue = { some: 'value' };

        const returnValue = await withTransaction(async (session) => {

            await testCollection.insertOne({}, { session });
            await testCollection.insertOne({}, { session });
            await testCollection.insertOne({}, { session: null });

            assert.equal(
                await testCollection.countDocuments({}, { session }),
                2
            );

            assert.equal(
                await testCollection.countDocuments({}, { session: null }),
                1
            );

            return expectedReturnValue;
        });

        assert.equal(
            await testCollection.countDocuments({}),
            3,
            'there should available documents after a commit'
        );

        assert.equal(returnValue, expectedReturnValue);
    });

    it('should rollback the transaction', async () => {

        const error = new Error('some error');

        await assert.rejects(() => withTransaction(async (session) => {

            await testCollection.insertOne({}, { session });
            await testCollection.insertOne({}, { session });

            assert.equal(
                await testCollection.countDocuments({}, { session }),
                2
            );

            throw error;

        }), error);

        assert.equal(
            await testCollection.countDocuments({}),
            0,
            'there should be no document after a rollback'
        );
    });

});
