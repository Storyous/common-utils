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
    omit,
    isObject
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
    ),
    exceptionHandlers: [new transports.Console()],
    // don't exit if the uncaught error is a loggly transport error
    exitOnError: (err) => !`${err}`.includes('logs-01.loggly.com')
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


/**
 * Wrapper for logger to allow special behaviour such as correlationId
 */
class LoggerWrapper {
    constructor (log) {
        this.logger = log;
    }

    trace (...args) {
        this._log('trace', ...args);
    }

    debug (...args) {
        this._log('debug', ...args);
    }

    info (...args) {
        this._log('info', ...args);
    }

    warn (...args) {
        this._log('warn', ...args);
    }

    error (...args) {
        this._log('error', ...args);
    }

    child (...args) {
        return new LoggerWrapper(this.logger.child(...args));
    }

    getCorrelationId () {
        return clsAdapter.getCorrelationId();
    }

    /**
     * Usage
     *     const app = new Koa();
     *     app.use(log.initKoa());
     *
     * Proxies the clsAdapter.getKoaMiddleware function to make the init process of
     * microservices easier without need of knowledge of clsAdapter and their function
     */
    initKoa () {
        return clsAdapter.getKoaMiddleware();
    }

    basicLogMiddleware ({
        fullLogMethods = ['POST', 'PUT', 'PATCH', 'DELETE'],
        log = this.logger
    } = {}) {
        return async (ctx, next) => {
            const startTime = new Date();
            const fullLog = fullLogMethods.includes(ctx.method.toUpperCase());
            let outResponse = {};

            if (fullLog) {
                // Better to log basic info right away,
                // there can be some errors that will not log the things after await
                log.info('Incoming request', {
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

            log.info('Outgoing response', outResponse);
        };
    }

    /**
     * Log line with new method
     * @param {string} method
     * @param args[]
     * @private
     */
    _log (method, args = []) {
        const thisArgs = [...args];
        if (isObject(thisArgs[0])) {
            thisArgs[0] = this._setCorrelationSessionId(args[0]);
        }
        if (isObject(args[1])) {
            thisArgs[1] = this._setCorrelationSessionId(args[1]);
        }
        this.logger[method](...args);
    }

    /**
     * Add correlation and sessionId
     * @param {Object} obj
     * @returns {Object} obj with correlationId and sessionId
     */
    _setCorrelationSessionId (obj) {
        const thisObj = {
            ...obj,
            correlationId: clsAdapter.getCorrelationId()
        };

        if (clsAdapter.getSessionId()) {
            obj.sessionId = clsAdapter.getSessionId();
        }
        return thisObj;
    }
}

const _loggerWrapper = new LoggerWrapper(logger);

module.exports = _loggerWrapper;
