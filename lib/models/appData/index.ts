'use strict';

import { ObjectId } from 'mongodb';
import getCollection from '../../getCollection';

const mongoDuplicateKeyErrorCodes = [11000, 11001];

type IdLike = ObjectId | string;

const appData = {

    get _collection () {
        return getCollection('appData');
    },

    _failReads: 0,

    ensureDocumentExists (document: { _id: IdLike }) {
        return this._collection
            .insertOne(document)
            .catch((err: any) => (
                new Promise((resolve, reject) => {
                    if (!mongoDuplicateKeyErrorCodes.includes(err.code)) {
                        return reject(err);
                    }
                    return resolve(null);
                })
            ));
    },

    updateDocument (id: IdLike, update: Object, upsert: boolean = false) {
        const query = { _id: id };
        const options = {
            returnOriginal: false,
            upsert: upsert
        };
        return this._collection
            .findOneAndUpdate(query, update, options)
            .then((result) => result.value);
    },

    getDocument (id: IdLike) {
        const query = { _id: id };
        return this._collection.findOne(query);
    }

};

export default appData;
