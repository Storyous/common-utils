import getMongoLocker, { LockKey, LockCallback, LockerOptions } from './getMongoLocker';
import getCollection from "./getCollection";

let lockerPromise: ReturnType<typeof getMongoLocker>;

export default async function <T>(key: LockKey, callback: LockCallback<T>, options: LockerOptions = {}): Promise<T> {
    if (!lockerPromise) {
        lockerPromise = getMongoLocker(getCollection('appLocks'));
    }

    const locker = await lockerPromise;

    return locker(key, callback, options);
}
