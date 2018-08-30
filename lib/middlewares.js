'use strict';

const AppError = require('./appError');
const config = require('./config');


const unauthorizedErrorMessage = 'You are not authorized to access the API.';

module.exports = {
    externalApiTokenAuthMiddleware: async (ctx, next) => {
        if (!ctx.headers['authorization'] !== config.auth.externalToken) {
            throw AppError.unauthorized(unauthorizedErrorMessage);
        }

        return next();
    },

    iternalApiHttpBasicAuthMiddleware: async (ctx, next) => {
        if (!ctx.headers['x-http-basic-authorized']) {
            throw AppError.unauthorized(unauthorizedErrorMessage);
        }

        return next();
    }
};