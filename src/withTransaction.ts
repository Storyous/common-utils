'use strict';

import mongoClient from './mongoClient';
import { ClientSession, TransactionOptions } from 'mongodb';

export default async <T>(callback: (session: ClientSession) => Promise<T>, options?: TransactionOptions): Promise<T> => {

    const session = mongoClient.startSession();

    try {
        let result: T;

        await session.withTransaction(async () => {
            result = await callback(session);
        }, options);

        // @ts-ignore
        return result;

    } finally {
        session.endSession();
    }
};
