'use strict';

const { ObjectId } = require('mongodb');
const mongoErrorCodes = require('./mongoErrorCodes');
const concurrentTask = require('./concurrentTask');
const AppError = require('./appError');

/**
 * @callback Locker
 * @param {*} key
 * @param {Function} callback
 * @param {{
 *     noLaterThan?: number
 *     startAttemptsDelay?: number
 * }} [options]
 * @returns {Promise<*>}
 */

/**
 * @param {Collection} collection
 * @returns {Promise<Locker>}
 */
module.exports = async (collection) => {

    await collection.createIndex({ acquiredAt: 1 }, { expireAfterSeconds: 120 });

    return async (key, callback, { noLaterThan = 1000, startAttemptsDelay = 50 } = {}) => {

        const lockId = new ObjectId();

        const releaseLock = () => collection.deleteOne({ _id: key, lockId });

        const acquireLock = async () => {
            try {
                await collection.insertOne({ _id: key, lockId, acquiredAt: new Date() });
            } catch (err) {
                if (mongoErrorCodes.DUPLICATE_KEY.includes(err.code)) {
                    throw AppError.concurrentRequest('The lock is already acquired.');
                }
                await releaseLock(); // the lock could be possible acquired
                throw err;
            }
        };

        await concurrentTask(acquireLock, { noLaterThan, startAttemptsDelay });

        try {
            return await callback();

        } finally {
            await releaseLock();
        }
    };
};
