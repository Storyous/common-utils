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
                /**
                 * 3 possible situations
                 * a) There is no lock -> upsert will create the document
                 * b) There is an expired lock -> expiresAt: { $lte: now } will match and the document will be replaced
                 * c) There is an unexpired lock -> expiresAt: { $lte: now } will not match,
                 * database will try to insert the new one, but it will fail on duplicate key (_id) error
                 */
                await collection.replaceOne(
                    { _id: key, expiresAt: { $lte: now } },
                    // replaceOne will use the _id from filter parameter when inserting new document
                    { lockId, expiresAt: new Date(now.getTime() + expireIn) },
                    { upsert: true }
                );
            } catch (err:any) {
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
