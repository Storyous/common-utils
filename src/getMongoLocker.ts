'use strict';

import { ObjectId, Collection } from 'mongodb';
import mongoErrorCodes from './mongoErrorCodes';
import concurrentTask from './concurrentTask';
import AppError from './appError';

export type LockKey = string | number | ObjectId;

export type LockCallback<T> = () => Promise<T>;

export type LockerOptions = {
    noLaterThan?: number,
    startAttemptsDelay?: number
    expireIn?: number
};

const _removeDeprecatedIndex = async (collection: Collection) => {
    const collectionStats = await collection.stats();
    if (collectionStats.indexDetails.acquiredAt_1) {
        await collection.dropIndex('acquiredAt_1');
    }
};

export default async (collection: Collection) => {

    await _removeDeprecatedIndex(collection);
    await collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

    return async <T>(
        key: LockKey,
        callback: LockCallback<T>,
        { noLaterThan = 1000, startAttemptsDelay = 50, expireIn = 120000 }: LockerOptions = {}
    ): Promise<T> => {

        const lockId = new ObjectId();

        const releaseLock = () => collection.deleteOne({ _id: key, lockId });

        const acquireLock = async () => {
            try {
                const now = new Date();
                await collection.replaceOne(
                    { _id: key, expiresAt: { $lte: now } },
                    { lockId, expiresAt: new Date(now.getTime() + expireIn) },
                    { upsert: true }
                );
            } catch (err) {
                if (mongoErrorCodes.DUPLICATE_KEY.includes(err.code)) {
                    throw AppError.concurrentRequest('The lock is already acquired.');
                }
                await releaseLock(); // the lock could be possible acquired
                throw err;
            }
        };

        await concurrentTask(acquireLock, { noLaterThan, startAttemptsDelay });

        try {
            return await callback();

        } finally {
            await releaseLock();
        }
    };
};
