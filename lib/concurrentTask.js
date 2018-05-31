'use strict';

const AppError = require('./appError');

function isConcurrentRequestError (err) {
    return err instanceof AppError && err.code === 409 && /^Concurrent request/.test(err.message);
}

/**
 * @param {function (): Promise.<T>} task
 * @param {number} maxTimes
 * @returns {Promise.<T>}
 * @template T
 */
const concurrentTask = (task, maxTimes) => (
    task().catch((err) => {
        if (--maxTimes > 0 && isConcurrentRequestError(err)) {
            return new Promise(res => setTimeout(res, Math.random() * 300))
                .then(() => concurrentTask(task, maxTimes));
        }

        return Promise.reject(err);
    })
);


module.exports = concurrentTask;
