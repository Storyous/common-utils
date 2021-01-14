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
};

export default async (collection: Collection) => {

    await collection.createIndex({ acquiredAt: 1 }, { expireAfterSeconds: 120 });

    return async <T>(
        key: LockKey,
        callback: LockCallback<T>,
        { noLaterThan = 1000, startAttemptsDelay = 50 }: LockerOptions = {}
    ): Promise<T> => {

        const lockId = new ObjectId();

        const releaseLock = () => collection.deleteOne({ _id: key, lockId });

        const acquireLock = async () => {
            try {
                await collection.insertOne({ _id: key, lockId, acquiredAt: new Date() });
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
