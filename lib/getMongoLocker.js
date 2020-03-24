'use strict';

const { ObjectId } = require('mongodb');
const mongoErrorCodes = require('./mongoErrorCodes');
const AppError = require('./appError');

module.exports = async (collection) => {

    await collection.createIndex({ acquiredAt: 1 }, { expireAfterSeconds: 120 });

    return async (key, callback) => {

        const lockId = new ObjectId();
        let possibleAcquired = true;

        try {

            await collection.insertOne({ _id: key, lockId, acquiredAt: new Date() });

            await callback();

        } catch (err) {

            if (mongoErrorCodes.DUPLICATE_KEY.includes(err.code)) {
                possibleAcquired = false;
                throw AppError.concurrentRequest('The lock is already acquired.');
            }

            throw err;

        } finally {
            if (possibleAcquired) {
                await collection.deleteOne({ _id: key, lockId });
            }
        }
    };
};
