'use strict';
const { NotAuthorized } = require('./notAuthorized');

class UserNotAuthorised extends NotAuthorized {

    /**
     * @param {string} merchantId
     */
    constructor (merchantId) {
        super();
        this.message = 'User is not authorised.';
        this.data = { merchantId };
    }
}
exports.UserNotAuthorised = UserNotAuthorised;
