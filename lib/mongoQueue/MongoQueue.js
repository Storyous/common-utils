'use strict';

const { Worker } = require('worker_threads');
const path = require('path');
const { times } = require('lodash');
const mongoErrorCodes = require('../mongoErrorCodes');
const pendingMessagesQuery = require('./pendingMessagesQuery');
const jobNames = require('./jobNames');


module.exports = class MongoQueue {

    constructor (collection) {
        this._collection = collection;
        this._pool = null;
    }

    async publish (messageId, payload, { session = null, delay = 0 } = {}) {

        const message = {
            _id: messageId,
            payload,
            publishedAt: new Date()
        };

        try {
            await this._collection.insertOne(message, { session });
        } catch (err) {
            if (!mongoErrorCodes.DUPLICATE_KEY.includes(err.code)) {
                throw err;
            }
        }
    }

    async consume (consumerPath, connectionString, countOfWorkers = 1) {

        this._workers = times(countOfWorkers, () => new Worker(path.join(__dirname, 'worker.js'), {
            workerData: {
                connectionString
            }
        }));

        // listen to messages
        this._changeStream = this._collection.watch([{ $match: { operationType: 'insert' } }]);
        this._changeStream.on('change', () => this._invokeAWorker());

        const countOfPending = await this._collection.countDocuments(pendingMessagesQuery, {
            limit: this._pool.maxWorkers
        });

        times(countOfPending, () => this._invokeAWorker());
    }

    _invokeAWorker () {
        if (this._pool.tasks.length < this._pool.maxWorkers) {
            this._pool.exec(jobNames.CONSUME_QUEUE);
        }
    }

};
