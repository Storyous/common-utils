'use strict';

const mongoClient = require('../../mongoClient');

const mongoDuplicateKeyErrorCodes = [11000, 11001];


const appData = {

    get _collection () {
        return mongoClient.db().collection('appData');
    },

    _failReads: 0,

    /**
     * @param {{_id: ObjectId|string}} document
     * @returns {Promise}
     */
    ensureDocumentExists (document) {
        return this._collection
            .insertOne(document)
            .catch((err) => (
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
        return this._collection
            .findOneAndUpdate(query, update, options)
            .then((result) => result.value);
    },

    /**
     * @param {mongodb.ObjectId|string} id
     * @returns {Promise.<Object>}
     */
    getDocument (id) {
        const query = { _id: id };
        return this._collection.findOne(query);
    }

};

module.exports = appData;
