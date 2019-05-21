'use strict';

const { pick } = require('lodash');
const AppError = require('./appError');
const log = require('./models/log').module('API');

const errorHandler = {

    /**
     * @returns {Function}
     */
    getErrorHandler () {

        return async function (ctx, next) {

            try {

                await next();

            } catch (originalError) {

                let err = originalError;

                if (!(err instanceof AppError)) {

                    if (err instanceof Error) {
                        const redirect = err.redirect || null;
                        err = new AppError(`${err.name}: ${err.message}`, 500, 500);
                        err.redirect = redirect;

                    } else if (typeof err === 'string') {
                        err = new AppError(err, 500, 500);

                    } else {
                        err = new AppError('Unknown error', 500, 500);
                    }

                    err.stack = originalError.stack;
                }

                const metaData = {
                    code: err.code,
                    httpStatus: err.httpStatus || 500,
                    url: ctx.request.originalUrl,
                    query: ctx.request.query,
                    method: ctx.req.method,
                    remoteAddress: ctx.req.headers['x-forwarded-for'] || ctx.req.connection.remoteAddress
                };

                if (!ctx.request.is('multipart/*')) {
                    metaData.body = ctx.request.body;
                }

                if (ctx.req.headers && ctx.req.headers.referer) {
                    metaData.referer = ctx.req.headers.referer;
                }

                if (err.redirect) {
                    metaData.redirect = err.redirect;
                }

                if (err.forceLogLevel) {
                    metaData.forceLogLevel = err.forceLogLevel;
                }

                if (err.httpStatus === 404 || err.httpStatus === 401 || err.httpStatus === 429) {
                    log.w(err, metaData);

                } else if (err.httpStatus === 500 || err.httpStatus === 408) {
                    log.e(err, metaData);

                } else {
                    metaData.response = err;
                    log.i(err, metaData);
                }

                ctx.status = err.httpStatus;
                ctx.body = { code: err.code, message: err.message, ...pick(err.meta, err.publicFields || []) };

            }

        };

    }

};

module.exports = errorHandler;
