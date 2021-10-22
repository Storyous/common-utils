'use strict';
const { NotAuthorized } = require('./notAuthorized');

class NotAuthorizedForPlace extends NotAuthorized {

    /**
     * @param {string} placeId
     */
    constructor (placeId) {
        super();
        this.message = 'User is not authorised for selected place.';
        this.data = { placeId };
    }
}
exports.NotAuthorizedForPlace = NotAuthorizedForPlace;
