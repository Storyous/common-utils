'use strict';

const winston = require('winston');
require('winston-loggly-bulk');
const { GELFTransport, UDPReporter } = require('@storyous/winston-gelf');

const { logging } = require('../../config');
const LoggerModule = require('./loggerModule');
const SentryTransport = require('./sentryTransport');


const consoleTransport = new winston.transports.Console(logging.console);

const graylogTransport = new GELFTransport(Object.assign(logging.graylog, {
    reporters: [new UDPReporter(logging.graylog.server)]
}));

const logglyTransport = new winston.transports.Loggly(logging.loggly);

const sentryTransport = new SentryTransport(logging.sentry);

const logger = new (winston.Logger)({
    transports: [
        consoleTransport,
        graylogTransport,
        sentryTransport,
        logglyTransport
    ]
});

/**
 *
 * @param moduleName
 * @returns {LoggerModule}
 */
logger.module = moduleName => (
    new LoggerModule(moduleName, logger)
);

module.exports = logger;
