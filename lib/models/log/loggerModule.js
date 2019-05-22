'use strict';

const _ = require('lodash');
const AppError = require('../../appError');


/**
 *
 * @param {string} name
 * @param {object} logger
 * @constructor
 */
class LoggerModule {
    constructor (name, logger) {
        this._logger = logger;
        this._name = `[${name.toUpperCase()}]`;
    }

    _findAndHidePassword (arg) {

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

    /**
     * @param {Error} err
     */
    _loggableError (err) {

        const metaError = {
            code: err.code || null,
            httpStatus: err.httpStatus || null,
            stack: err.stack
        };

        if (err instanceof AppError) {
            metaError.error = err.message;
            metaError.meta = err.meta;

        } else {
            metaError.error = `${err.name}: ${err.message}`;
        }

        return metaError;
    }

    _log (type, otherArgs) {

        const args = [type, this._name];
        for (let i = 0; i < otherArgs.length; i++) {
            let _args = this._findAndHidePassword(otherArgs[i]);
            if (_args && _args.error instanceof Error) {
                _args.error = this._loggableError(_args.error);

            } else if (_args instanceof Error) {
                _args = this._loggableError(_args);
            }

            args.push(_args);
        }

        this._logger.log(...args);
    }

    /**
     * info
     */
    i (...args) {
        let logLevel = 'info';
        if (args[1]) {
            logLevel = args[1].forceLogLevel || logLevel;
        }
        this._log(logLevel, args);
    }

    /**
     * warn
     */
    w (...args) {
        let logLevel = 'warn';
        if (args[1]) {
            logLevel = args[1].forceLogLevel || logLevel;
        }
        this._log(logLevel, args);
    }

    /**
     * error
     */
    e (...args) {
        let logLevel = 'error';
        if (args[1]) {
            logLevel = args[1].forceLogLevel || logLevel;
        }
        this._log(logLevel, args);
    }

    /**
     * @param {string} text
     * @param {boolean} [logTime=false] - only if exact time of start and end is needed
     */
    profile (text, logTime) {

        if (logTime) {
            this.i(`PROFILE ${text} at ${new Date().toISOString()}`);
        }

        this._logger.profile(text);
    }

}

module.exports = LoggerModule;
