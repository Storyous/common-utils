'use strict';

import { load, MigrationSet } from 'migrate';
import MigrationsStore from './MigrationsStore';
import config from '../../config';
import mongoLocker from '../../mongoLocker';
import AppError from '../../appError';
import { LockerOptions } from '../../getMongoLocker';

const log = require('../log');

const logger = log.module('migrations');

const MIGRATIONS_LOCK_KEY = 'migrations:run';

export type RunMigrationsOptions = {
    continueOnError?: boolean; // If app crashes on error or continue
    safeMigration?: boolean; // Do not allow to rewrite all migrations with empty array
    lockerOptions?: LockerOptions; // Lock options for distributed locking to prevent concurrent migration execution.
    skipLock?: boolean; // Skip distributed locking (not recommended in production with multiple instances).
};

/**
 * In case of fail - logs the result and returns rejected promise
 * @param {string} directory Path to directory where migrations are
 * @param {RunMigrationsOptions} runMigrationsOptions
 */
export default async function runMigrations (directory: string, {
    continueOnError = config.isProduction(),
    safeMigration = true,
    lockerOptions = {
        expireIn: 600000 // 10 minutes
        // noLaterThan and startAttemptsDelay remain default by mongoLocker
    },
    skipLock = false
}: RunMigrationsOptions = {}) {
    const executeMigrations = () => new Promise<void>((resolve, reject) => {
        load({
            // migrate's FileStore type assumes a file-based store; our MongoDB store is compatible at runtime
            stateStore: new MigrationsStore(safeMigration) as Parameters<typeof load>[0]['stateStore'],
            migrationsDirectory: directory,
            filterFunction: (file: string) => file.endsWith('.js')
        }, (err: Error | null, set: MigrationSet) => {

            if (err) {
                log.error('Migrations did not run due to error', err);
                reject(err);
                return;
            }

            set.on('warning', (msg: string) => {
                logger.warn('warning', msg);
            });

            set.on('migration', (migration: { title: string }, direction: string) => {
                logger.info(`Running ${direction} migration`, { title: migration.title });
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

    if (skipLock) {
        logger.info('Running migrations without distributed lock');
        return executeMigrations();
    }

    try {
        logger.info('Attempting to acquire migration lock');
        return await mongoLocker(MIGRATIONS_LOCK_KEY, executeMigrations, lockerOptions);
    } catch (error: any) {
        if (AppError.isConcurrentRequestError(error)) {
            logger.info('Another instance is running migrations');
            return Promise.resolve();
        }
        logger.error('Error while acquiring migration lock', error);
        return Promise.reject(error);
    }
}
