'use strict';
const { NotAuthorized } = require('./notAuthorized');

class NotAuthorizedForPlace extends NotAuthorized {

    /**
     * @param {string} placeId
     */
    constructor (placeId) {
        super('User is not authorised for selected place.', {
            placeId
        });
    }
}
exports.NotAuthorizedForPlace = NotAuthorizedForPlace;
