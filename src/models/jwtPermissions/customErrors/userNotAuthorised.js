'use strict';
const { NotAuthorized } = require('./notAuthorized');

class UserNotAuthorised extends NotAuthorized {

    /**
     * @param {string} merchantId
     */
    constructor (merchantId) {
        super('User is not authorised', {
            merchantId
        });
    }
}
exports.UserNotAuthorised = UserNotAuthorised;
