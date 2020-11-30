'use strict';

const AppError = require('./appError');
const prometheusMiddlewares = require('./models/prometheus/prometheusMiddlewares');


const middlewares = {
    getRouterAuthorizationMiddleware (routerToken) {
        return (ctx, next) => {
            if (ctx.headers.authorization !== routerToken) {
                throw AppError.unauthorized();
            }
            return next();
        };
    },
    ...prometheusMiddlewares
};

module.exports = middlewares;
