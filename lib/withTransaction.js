'use strict';

const mongoClient = require('./mongoClient');

/**
 * @param {Function} callback
 * @param {TransactionOptions} [options]
 * @returns {Promise<*>}
 */
module.exports = async (callback, options) => {

    const session = mongoClient.startSession();

    try {
        let result;

        await session.withTransaction(async () => {
            result = await callback(session);
        }, options);

        return result;

    } finally {
        session.endSession();
    }
};
