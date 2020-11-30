'use strict';

const _ = require('lodash');

const fixtures = {

    /**
     *
     * @param {Object[]} _fixtures
     * @param {Collection} collection
     * @returns {Promise}
     */
    ensureInCollection (_fixtures, collection) {
        const fixtureIds = [];
        const objectMap = {};

        _fixtures.forEach((object) => {
            fixtureIds.push(object._id);
            objectMap[object._id.toString()] = object;
        });

        return collection.find({
            _id: { $in: fixtureIds }
        }, {
            fields: {
                _id: true
            }
        }).toArray().then((existing) => {

            existing.forEach((object) => {
                const stringId = object._id.toString();
                delete objectMap[stringId];
            });

            const filteredObjects = _.toArray(objectMap);

            if (filteredObjects.length) {
                return collection.insertMany(filteredObjects);
            }

            return Promise.resolve(null);
        });

    }

};

module.exports = fixtures;
