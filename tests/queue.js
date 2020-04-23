'use strict';

const { describe, it, beforeEach } = require('mocha');
const { ObjectId } = require('mongodb');
const { times } = require('lodash');
const getTestDatabase = require('./getTestDatabase');


describe('queue', () => {

    let db;
    /**
     * @type {mongodb.Collection}
     */
    let collection;

    beforeEach(async () => {
        db = await getTestDatabase();
        collection = db.db.collection('queue');
        try {
            await collection.drop();
        } catch (e) {} // eslint-disable-line no-empty
    });

    it.only('should work do stuff', async () => {


        const publish = async () => {
            const id = new ObjectId();
            console.log(new Date().toISOString(), `publishing ${id}`);
            await collection.insertOne({ _id: id, publishedAt: new Date() });
        };

        const countOfWorkers = 1;

        times(countOfWorkers, (i) => {
            const pipeline = [
                {
                    $match: {
                        // operationType: 'insert'
                        /* $expr: {
                            $eq: [
                                { $mod: [{ $millisecond: '$fullDocument.publishedAt' }, countOfWorkers] },
                                i
                            ]
                        } */
                    }
                }
            ];

            collection.watch(pipeline, { batchSize: 10 })
                .on('change', async (doc) => {
                    console.log(new Date().toISOString(), ` - ${i} received ${doc.operationType}`);
                    await new Promise((res) => setTimeout(res, 600));
                });
        });

        await new Promise((resolve) => setTimeout(resolve, 1000));

        await Promise.all(times(100, publish));

        await new Promise((resolve) => setTimeout(resolve, 100));

    }).timeout(0);

    describe('queue creation', () => {
        it('should create proper indexes');
    });

    describe('publishing', () => {
        it('should be possible to publish a message', () => {

        });

        it('should be ok to publish one message multiple nd times');

        it('should be possible to publish a message within a transaction');
    });

    describe('consumption', () => {

        it('should be possible to consume a message');

        it('should consume a message nearly instantly');

        it('should be possible to spawn multiple consumers');

        it('should handle failures and retry');

    });


});
