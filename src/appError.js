'use strict';

class AppError extends Error {

    /**
     * @param {string} message
     * @param {{}} [meta]
     * @constructor
     */
    constructor (message, meta) {
        super();

        /**
         * @type {string}
         */
        this.message = message;

        /**
         * @type {number|string}
         */
        this.code = (meta && meta.code) || null;

        /**
         * @type {number}
         */
        this.httpStatus = (meta && meta.httpStatus) || 500;

        /**
         * @type {Object.<string, *>}
         */
        this.meta = meta || null;

        /**
         * @type {string}
         */
        this.redirect = null;
    }

    /**
     * @param {Object} meta
     * @returns {AppError}
     */
    setMeta (meta) {
        this.meta = meta;
        return this;
    }
}

function purifyStack (error) {
    error.stack = error.stack.split('\n').filter((line, index) => index !== 1).join('\n');
    return error;
}

/**
 * @param {string} [message]
 * @param {Object} [meta]
 * @returns {AppError}
 */
AppError.notFound = (message, meta) => {

    let allMessage = 'Not found';
    if (message) {
        allMessage += `: ${message}`;
    }

    const error = new AppError(allMessage, ({
        code: 404,
        httpStatus: 404,
        ...meta
    }));

    return purifyStack(error);
};

/**
 *
 * @param {string} [message]
 * @param {Object} [meta]
 * @returns {AppError}
 */
AppError.badRequest = (message, meta) => {
    let allMessage = 'Bad request';
    if (message) {
        allMessage += `: ${message}`;
    }

    const error = new AppError(allMessage, ({
        code: 400,
        httpStatus: 400,
        ...meta
    }));

    return purifyStack(error);
};

/**
 *
 * @param {string} [message]
 * @param {Object} [meta]
 * @returns {AppError}
 */
AppError.concurrentRequest = (message, meta) => {
    let allMessage = 'Concurrent request';
    if (message) {
        allMessage += `: ${message}`;
    }

    const error = new AppError(allMessage, ({
        code: 409,
        httpStatus: 409,
        ...meta
    }));

    return purifyStack(error);
};

AppError.isConcurrentRequestError = (err) => (
    err instanceof AppError && err.code === 409 && /^Concurrent request/.test(err.message)
);

/**
 * @param {string} [message]
 * @param {Object} [meta]
 * @returns {AppError}
 */
AppError.unauthorized = (message, meta) => {
    let allMessage = 'Unauthorized';
    if (message) {
        allMessage += `: ${message}`;
    }

    const error = new AppError(allMessage, ({
        code: 401,
        httpStatus: 401,
        ...meta
    }));

    return purifyStack(error);
};

/**
 *
 * @param {string} [message]
 * @param {Object} [meta]
 * @returns {AppError}
 */
AppError.internal = (message, meta) => {
    let allMessage = 'Internal';
    if (message) {
        allMessage += `: ${message}`;
    }

    const error = new AppError(allMessage, ({
        code: 500,
        httpStatus: 500,
        ...meta
    }));

    return purifyStack(error);
};

module.exports = AppError;
