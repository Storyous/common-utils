'use strict';

const { createLogger, format, transports } = require('winston');
require('winston-loggly-bulk');
const TransportStream = require('winston-transport');
const Sentry = require('@sentry/node');
const { clone, isError } = require('lodash');

const { logging, env } = require('../config');
const clsAdapter = require('./clsAdapter');

const transportEnabled = (name) => logging[name] && !logging[name].silent;


function _findAndHidePassword (arg) {

    if (arg && arg.body && (arg.body.password || arg.body.currentPassword)) {
        const clonedArg = clone(arg);
        clonedArg.body = clone(arg.body);

        if (arg.body.password) {
            clonedArg.body.password = '**********';
        }

        if (arg.body.currentPassword) {
            clonedArg.body.currentPassword = '**********';
        }

        return clonedArg;
    }

    return arg;
}

const logger = createLogger({
    format: format.combine(
        format((info) => {
            if (isError(info)) {
                return { ...info, stack: info.stack };
            }
            return info;
        })(),
        // Redact any properties
        format((info) => _findAndHidePassword(info))()
    )
});

if (transportEnabled('console')) {
    const options = {
        format: format.combine(
            format.colorize(),
            format.simple()
        ),
        ...logging.console
    };
    logger.add(new transports.Console(options));
}


if (transportEnabled('sentry')) {

    const { sentry: config } = logging;

    Sentry.init({ dsn: config.dsn, environment: env });

    const levelMap = {
        silly: Sentry.Severity.Debug,
        verbose: Sentry.Severity.Debug,
        info: Sentry.Severity.Info,
        debug: Sentry.Severity.Debug,
        warn: Sentry.Severity.Warning,
        error: Sentry.Severity.Error
    };

    const sentryTransport = Object.assign(new TransportStream({
        level: config.level,
        silent: config.silent
    }), {
        log (info, callback) {
            Sentry.withScope((scope) => {
                scope.setFingerprint(['{{ default }}', info.message]);
                scope.setLevel(levelMap[info.level]);

                if (info.module) {
                    scope.setTag('module', info.module);
                }

                if (info.meta) {
                    scope.setExtras(info.meta);
                }

                let error = info.stack && info;

                if (error && !isError(error)) {
                    error = Object.assign(new Error(info.message), {
                        stack: info.stack
                    });
                }

                if (error) {
                    Sentry.captureException(error);
                } else {
                    Sentry.captureMessage(info);
                }
            });
            callback();
        }
    });

    logger.add(sentryTransport);
}


if (transportEnabled('loggly')) {
    const options = {
        stripColors: true, // because of bug - there is no message for native Errors without this flag
        ...logging.loggly
    };
    logger.add(new transports.Loggly(options));
}

/**
 * @param {string} moduleName
 * @returns {winston.Logger}
 */
logger.module = (moduleName) => logger.child({ module: moduleName });

/**
 * Usage
 * logger.id().info('hmmm', { more: 'info' });
 * @return {Span | winston.Logger}
 */
logger.id = function () {
    const attachedProperties = {
        correlationId: clsAdapter.getCorrelationId()
    };

    if (clsAdapter.getSessionId()) {
        attachedProperties.sessionId = clsAdapter.getSessionId();
    }

    // By using `this` I can use the object that is calling this function
    // If I use logger.child directly here, the logger.module is no more compatible.
    return this.child(attachedProperties);
};

/**
 * Usage
 *     const app = new Koa();
 *     app.use(log.initKoa());
 *
 * Proxies the clsAdapter.getKoaMiddleware function to make the init process of
 * microservices easier without need of knowledge of clsAdapter and their function
 */
logger.initKoa = () => clsAdapter.getKoaMiddleware();


module.exports = logger;
