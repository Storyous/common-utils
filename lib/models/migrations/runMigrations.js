'use strict';

const migrate = require('migrate');
const MigrationsStore = require('./MigrationsStore');
const log = require('../log').module('migrations');
const config = require('../../config');

/**
 * In case of fail - logs the result and returns rejected promise
 *
 * @param {string} directory
 * @param {boolean} [continueOnError=config.isProduction()] - only in production by default
 * @returns {Promise<void>} - returns rejected promise
 */
module.exports = async function runMigrations (directory, { continueOnError = config.isProduction() } = {}) {

    return new Promise((resolve, reject) => {
        migrate.load({
            stateStore: new MigrationsStore(),
            migrationsDirectory: directory,
            filterFunction: (file) => file.endsWith('.js')
        }, (err, set) => {

            if (err) {
                log.error('Migrations did not run due to error', err);
                reject(err);
                return;
            }

            set.on('warning', (msg) => {
                log.warn('warning', msg);
            });

            set.on('migration', (migration, direction) => {
                log.info(`Running ${direction} migration`, migration.title);
            });

            set.up((error) => {
                if (error) {
                    log.error('A migration ended with error', error);
                    if (!continueOnError) {
                        reject(error);
                        return;
                    }

                } else {
                    log.info('Migrations successfully ran');
                }

                resolve();
            });
        });
    });

};
