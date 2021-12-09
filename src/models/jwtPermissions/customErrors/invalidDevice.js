'use strict';
const { NotAuthorized } = require('./notAuthorized');

class InvalidDevice extends NotAuthorized {

    /**
     * @param {string} deviceId
     */
    constructor (deviceId) {
        super();
        this.message = 'Invalid device.';
        this.data = { deviceId };
    }
}
exports.InvalidDevice = InvalidDevice;
