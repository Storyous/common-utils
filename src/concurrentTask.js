'use strict';

const AppError = require('./appError');

const attemptRecursive = async (task, startAttemptsDelay, latestTime, callNumber) => (
    task().catch(async (err) => {
        if (AppError.isConcurrentRequestError(err)) {
            const nextCallDelay = startAttemptsDelay * (callNumber ** 2);
            if ((Date.now() + nextCallDelay) < latestTime) {
                await new Promise((resolve) => setTimeout(resolve, nextCallDelay));
                return attemptRecursive(task, startAttemptsDelay, latestTime, ++callNumber);
            }
        }

        throw err;
    })
);

/**
 * noLaterThan = In what time by now should be the latest attempt executed
 * startAttemptsDelay = Starting attempts delay
 *
 * @param {function (): Promise.<T>} task
 * @param {{
 *     noLaterThan?: number
 *     startAttemptsDelay?: number
 * }} [options]
 * @returns {Promise.<T>}
 * @template T
 */
const concurrentTask = async (task, { noLaterThan = 2000, startAttemptsDelay = 50 } = {}) => (
    attemptRecursive(task, startAttemptsDelay, Date.now() + noLaterThan, 1)
);

module.exports = concurrentTask;
