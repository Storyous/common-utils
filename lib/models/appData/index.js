/**
 * Created by Václav Oborník on 16. 9. 2015.
 */

'use strict';

const db = require('../db');

const mongoDuplicateKeyErrorCodes = [11000, 11001];


const appData = {

    _collection: null,

    _failReads: 0,

    _getCollection () {

        if (this._collection === null) {
            this._collection = db.db.collection('appData');
        }

        return this._collection;
    },

    /**
     * @param {{_id: ObjectId|string}} document
     * @returns {Promise}
     */
    ensureDocumentExists (document) {
        return this._getCollection()
            .insertOne(document)
            .catch(err => (
                new Promise((resolve, reject) => {
                    if (!mongoDuplicateKeyErrorCodes.includes(err.code)) {
                        return reject(err);
                    }
                    return resolve(null);
                })
            ));
    },

    /**
     * @param {mongodb.ObjectId|string} id
     * @param {{}} update
     * @param {boolean} [upsert]
     * @returns {Promise.<Object>}
     */
    updateDocument (id, update, upsert) {
        const query = { _id: id };
        const options = {
            returnOriginal: false,
            upsert: upsert || false
        };
        return this._getCollection()
            .findOneAndUpdate(query, update, options)
            .then(result => result.value);
    },

    /**
     * @param {mongodb.ObjectId|string} id
     * @returns {Promise.<Object>}
     */
    getDocument (id) {
        const query = { _id: id };
        return this._getCollection().findOne(query);
    }

};

module.exports = appData;
