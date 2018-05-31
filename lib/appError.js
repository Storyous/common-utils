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
        this.info = meta || null;

        /**
         * @type {string}
         */
        this.redirect = null;
    }
}

/**
 * @param {string} [arg]
 * @returns {AppError}
 */
AppError.notFound = function (arg) {

    let message = 'Not found';
    if (arg) {
        message += `: ${arg}`;
    }

    const err = new AppError(message);
    err.code = 404;
    err.httpStatus = 404;

    return err;
};

/**
 *
 * @param {string} [arg]
 * @param {number} [specialCode]
 * @returns {AppError}
 */
AppError.badRequest = function (arg, specialCode) {
    let message = 'Bad request';
    if (arg) {
        message += `: ${arg}`;
    }

    return new AppError(message, {
        code: specialCode || 400,
        httpStatus: 400
    });
};

/**
 *
 * @param {string} [arg]
 * @returns {AppError}
 */
AppError.concurrentRequest = function (arg) {
    let message = 'Concurrent request';
    if (arg) {
        message += `: ${arg}`;
    }

    return new AppError(message, {
        code: 409,
        httpStatus: 409
    });
};

/**
 *
 * @param {string} [arg]
 * @returns {AppError}
 */
AppError.unauthorized = function (arg) {
    let message = 'Unauthorized';
    if (arg) {
        message += `: ${arg}`;
    }

    return new AppError(message, {
        code: 401,
        httpStatus: 401
    });
};

/**
 *
 * @param {string} [arg]
 * @returns {AppError}
 */
AppError.internal = function (arg) {
    let message = 'Internal';
    if (arg) {
        message += `: ${arg}`;
    }

    return new AppError(message, {
        code: 500,
        httpStatus: 500
    });
};


module.exports = AppError;
