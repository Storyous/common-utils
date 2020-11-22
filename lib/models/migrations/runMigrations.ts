'use strict';

const migrate = require('migrate'); // TODO update to version with typings it it is published yet, get rid of 'any's
const log = require('../log');
import MigrationsStore from './MigrationsStore';
import config from '../../config';

const logger = log.module('migrations');

/**
 * In case of fail - logs the result and returns rejected promise
 */
export default async function runMigrations (directory: string, { continueOnError = config.isProduction() } = {}) {

    return new Promise<void>((resolve, reject) => {
        migrate.load({
            stateStore: new MigrationsStore(),
            migrationsDirectory: directory,
            filterFunction: (file: string) => file.endsWith('.js')
        }, (err: Error|null, set: any) => {

            if (err) {
                log.error('Migrations did not run due to error', err);
                reject(err);
                return;
            }

            set.on('warning', (msg: string) => {
                logger.warn('warning', msg);
            });

            set.on('migration', (migration: any, direction: string) => {
                logger.info(`Running ${direction} migration`, migration.title);
            });

            set.up((error?: Error) => {
                if (error) {
                    logger.error('A migration ended with error', error);
                    if (!continueOnError) {
                        reject(error);
                        return;
                    }

                } else {
                    logger.info('Migrations successfully ran');
                }

                resolve();
            });
        });
    });

};
