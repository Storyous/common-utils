'use strict';

const { pick, isEmpty } = require('lodash');
const AppError = require('./appError');
const log = require('./models/log').module('API');


module.exports = async function (ctx, next) {

    try {

        await next();

    } catch (originalError) {

        let err = originalError;

        if (!(err instanceof AppError)) {

            if (err instanceof Error) {
                const redirect = err.redirect || null;
                err = new AppError(`${err.name}: ${err.message}`);
                err.redirect = redirect;

            } else if (typeof err === 'string') {
                err = new AppError(err);

            } else {
                err = new AppError('Unknown error');
            }

            err.stack = originalError.stack;
        }

        const metaData = {
            httpStatus: err.httpStatus || 500,
            url: ctx.request.originalUrl,
            query: ctx.request.query,
            method: ctx.req.method,
            remoteAddress: ctx.get('x-forwarded-for') || ctx.req.connection.remoteAddress
        };

        if (err.code) {
            metaData.code = err.code;
        }

        if (!ctx.request.is('multipart/*')) {
            metaData.body = ctx.request.body;
        }

        if (ctx.req.headers && ctx.req.headers.referer) {
            metaData.referer = ctx.req.headers.referer;
        }

        if (err.redirect) {
            metaData.redirect = err.redirect;
        }

        const originalMeta = err.meta;

        if (!isEmpty(err.meta)) {
            metaData.meta = err.meta;
        }

        err.setMeta(metaData);

        if (err.httpStatus === 404 || err.httpStatus === 401 || err.httpStatus === 429) {
            log.warn(err);

        } else if (err.httpStatus === 500 || err.httpStatus === 408) {
            log.error(err);

        } else {
            log.info(err);
        }

        ctx.body = {
            code: err.code,
            message: err.message,
            ...pick(originalMeta, err.publicFields || [])
        };
        ctx.status = err.httpStatus;
    }

};
