'use strict';

const MigrationsStore = require('./MigrationsStore');
const migrate = require('migrate');
const log = require('../log').module('migrations');

/**
 * In case of fail - logs the result and returns rejected promise
 *
 * @param {string} directory
 * @returns {Promise<void>} - returns rejected promise
 */
module.exports = async function runMigrations (directory) {

    return new Promise((resolve, reject) => {
        migrate.load({
            stateStore: new MigrationsStore(),
            migrationsDirectory: directory,
            filterFunction: file => file.endsWith('.js')
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
                    log.error('Migration ends with error', error);
                    reject(error);
                    return;

                }

                log.info('Migrations successfully ran');
                resolve();
            });
        });
    });

};
