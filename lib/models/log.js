'use strict';

const { createLogger, format, transports } = require('winston');
require('winston-loggly-bulk');
const Sentry = require('winston-sentry-raven-transport');
const _ = require('lodash');

const { logging } = require('../config');

const transportEnabled = name => logging[name] && !logging[name].silent;


function _findAndHidePassword (arg) {

    if (arg && arg.body && (arg.body.password || arg.body.currentPassword)) {
        const clonedArg = _.clone(arg);
        clonedArg.body = _.clone(arg.body);

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
        // Redact any properties
        format(info => _findAndHidePassword(info))()
    )
});

if (transportEnabled('console')) {
    const options = Object.assign(
        {
            format: format.combine(
                format.colorize(),
                format.simple()
            )
        },
        logging.console
    );
    logger.add(new transports.Console(options));
}


if (transportEnabled('sentry')) {
    logger.add(new Sentry(logging.sentry));
}


if (transportEnabled('loggly')) {
    const options = Object.assign({
        stripColors: true // because of bug - there is no message for native Errors without this flag
    }, logging.loggly);
    logger.add(new transports.Loggly(options));
}

/**
 * @param {string} moduleName
 * @returns {winston.Logger}
 */
logger.module = moduleName => logger.child({ module: moduleName });

module.exports = logger;
