'use strict';

const winston = require('winston');
require('winston-loggly-bulk');
const { has } = require('lodash');

const { logging } = require('../../config');
const LoggerModule = require('./loggerModule');
const SentryTransport = require('./sentryTransport');

const transports = [
    new winston.transports.Console(logging.console),
    new SentryTransport(logging.sentry)
];

if (has(logging, 'loggly') && !logging.loggly.silent) {
    transports.push(new winston.transports.Loggly(logging.loggly));
}

const logger = new (winston.Logger)({ transports });

/**
 *
 * @param moduleName
 * @returns {LoggerModule}
 */
logger.module = moduleName => (
    new LoggerModule(moduleName, logger)
);

module.exports = logger;
