'use strict';

require('./getMongoClient');

const assert = require('assert');
const { beforeEach, describe, it } = require('mocha');
const { appData, getCollection, runMigrations } = require('../lib');

describe('runMigrations', () => {
    beforeEach(async () => {
        await appData._collection.deleteOne({ _id: 'migrations' });
        const lockCollection = getCollection('appLocks');
        await lockCollection.deleteOne({ _id: 'migrations:run' });
    });

    async function getMigrationPromise (args = {}) {
        return runMigrations(`${__dirname}/migrations`, {
            safeMigration: false,
            continueOnError: false,
            ...args
        });
    }

    async function assertMigrationData (expectedLastRun = '1642152064249-test.js') {
        const migration = await appData.getDocument('migrations');
        assert.deepStrictEqual(migration.lastRun, expectedLastRun);
    }

    it('should run migrations', async () => {
        await getMigrationPromise();
        await assertMigrationData();
    });

    describe('migrations check with DB lock', () => {
        async function findLockCollection () {
            const lockCollection = getCollection('appLocks');
            return lockCollection.findOne({ _id: 'migrations:run' });
        }

        it('should use lock when skipLock is false/undefined', async () => {
            let foundLockCounter = 0;
            const callback = async () => {
                for (let i = 0; i < 10; i++) {
                    getMigrationPromise({
                        lockerOptions: { noLaterThan: 10 }
                    });
                    // eslint-disable-next-line no-await-in-loop
                    if (await findLockCollection()) {
                        foundLockCounter++;
                    }
                }
            };

            await callback();

            assert.ok(foundLockCounter >= 5, 'Lock was not found in any of the attempts');

            await assertMigrationData();
        });

        it('should not use lock when skipLock is true', async () => {
            let foundLockCounter = 0;
            const callback = async () => {
                for (let i = 0; i < 10; i++) {
                    getMigrationPromise({
                        skipLock: true
                    });
                    // eslint-disable-next-line no-await-in-loop
                    if (await findLockCollection()) {
                        foundLockCounter++;
                    }
                }
            };

            await callback();

            assert.strictEqual(foundLockCounter, 0, 'Lock was found in some of the attempts');

            await assertMigrationData();
        });
    });
});
