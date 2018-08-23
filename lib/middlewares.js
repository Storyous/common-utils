'use strict';

const AppError = require('./appError');
const config = require('./config');


const unauthorizedError = AppError.unauthorized('You are not authorized to access the API.');

module.exports = {
    externalApiTokenAuthMiddleware: async (ctx, next) => {
        if (!ctx.headers['Authorization'] !== config.auth.externalToken) {
            throw unauthorizedError;
        }

        return next();
    },

    iternalApiHttpBasicAuthMiddleware: async (ctx, next) => {
        if (!ctx.headers['x-http-basic-authorized']) {
            throw unauthorizedError;
        }

        return next();
    }
};