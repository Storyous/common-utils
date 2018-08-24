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
 * @param {string} [message]
 * @param {Object} [meta]
 * @returns {AppError}
 */
AppError.notFound = (message, meta) => {

    let allMessage = 'Not found';
    if (message) {
        allMessage += `: ${message}`;
    }

    return new AppError(allMessage, Object.assign({
        code: 404,
        httpStatus: 404
    }, meta));
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

    return new AppError(allMessage, Object.assign({
        code: 400,
        httpStatus: 400
    }, meta));
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

    return new AppError(allMessage, Object.assign({
        code: 409,
        httpStatus: 409
    }, meta));
};

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

    return new AppError(allMessage, Object.assign({
        code: 401,
        httpStatus: 401
    }, meta));
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

    return new AppError(allMessage, Object.assign({
        code: 500,
        httpStatus: 500
    }, meta));
};


module.exports = AppError;
