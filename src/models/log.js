'use strict';

const {
    createLogger,
    format,
    transports
} = require('winston');
const { Loggly } = require('winston-loggly-bulk');
const TransportStream = require('winston-transport');
const Sentry = require('@sentry/node');
const {
    clone,
    isError,
    get,
    omit
} = require('lodash');
const appRoot = require('app-root-path');

const {
    logging,
    env
} = require('../config');
const clsAdapter = require('./clsAdapter');

const transportEnabled = (name) => logging[name] && !logging[name].silent;

let appName = 'nonresolved';

try {
    // eslint-disable-next-line global-require,import/no-dynamic-require
    const packageJson = require(`${appRoot.path}/package.json`);
    appName = packageJson.name || 'nonresolved';
} catch (err) {
    // eslint-disable-next-line no-console
    console.error(err, 'Unable to resolve the name of app for logs');
}

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
                return {
                    ...info,
                    stack: info.stack
                };
            }
            return info;
        })(),
        // Redact any properties
        format((info) => _findAndHidePassword(info))(),
        format((info) => {
            const updated = {
                ...info,
                correlationId: clsAdapter.getCorrelationId()
            };

            if (clsAdapter.getSessionId()) {
                updated.sessionId = clsAdapter.getSessionId();
            }

            return updated;
        })()
    )
})
    .child({ appName });

if (transportEnabled('console')) {
    let options = {
        format: format.combine(
            format.colorize(),
            format.simple()
        ),
        ...logging.console
    };
    // Use for localhost development only, it will output nicely readable logs
    // and if error appears the stack will be clickable in webstorm
    if (get(logging, 'console.prettyOutput')) {
        const logStackAndOmitIt = format((info) => {
            if (info.stack) {
                // eslint-disable-next-line no-console
                console.error(info.stack);
                return omit(info, 'stack');
            }
            return info;
        });

        options = {
            format: format.combine(
                logStackAndOmitIt(),
                format.prettyPrint()
            )
        };
    }

    logger.add(new transports.Console(options));
}


if (transportEnabled('sentry')) {

    const { sentry: config } = logging;

    Sentry.init({
        dsn: config.dsn,
        environment: env
    });

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
        isBulk: true,
        ...logging.loggly
    };
    logger.add(new Loggly(options));
}

/**
 * @param {string} moduleName
 * @returns {winston.Logger}
 */
logger.module = (moduleName) => logger.child({ module: moduleName });

/**
 * Usage
 *     const app = new Koa();
 *     app.use(log.initKoa());
 *
 * Proxies the clsAdapter.getKoaMiddleware function to make the init process of
 * microservices easier without need of knowledge of clsAdapter and their function
 */
logger.initKoa = () => clsAdapter.getKoaMiddleware();

logger.basicLogMiddleware = ({ fullLogMethods = ['POST', 'PUT', 'PATCH', 'DELETE'] }) => async (ctx, next) => {
    const startTime = new Date();
    const fullLog = fullLogMethods.contains(ctx.method.toUpperCase());
    let outResponse = {};

    if (fullLog) {
        // Better to log basic info right away, there can be some errors that will not log the things after await
        logger.info('Incoming request', {
            headersRequest: omit(ctx.headers, ['authorization', 'x-authorization', 'x-scopes']),
            url: ctx.url,
            method: ctx.method
        });
    }

    await next();

    const matched = get(ctx, 'matched', [])
        .map((match) => match.path)
        // // These two values are in every single request and it is just polluting graphs and logs
        .filter((path) => path !== '*' && path !== '(.*)' && path !== '([^/]*)');

    outResponse = {
        status: ctx.status,
        // Loggly cannot split graphs based on number-based fields, this is recommended approach by them
        // **Facepalm**
        statusStr: `${ctx.status}`,
        duration: new Date() - startTime,
        lastMatched: matched[matched.length - 1]
    };

    if (fullLog) {
        outResponse = {
            ...outResponse,
            matched,
            headersSent: ctx.response.headers
        };
    } else {
        outResponse = {
            ...outResponse,
            url: ctx.url,
            method: ctx.method
        };
    }

    logger.info('Outgoing response', outResponse);
};

/**
 * Returns current correlationId if it is specified by KoaMiddleware
 */
logger.getCorrelationId = () => clsAdapter.getCorrelationId();


module.exports = logger;
