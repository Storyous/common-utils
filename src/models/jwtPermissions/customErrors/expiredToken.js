'use strict';
const { NotAuthorized } = require('./notAuthorized');

class ExpiredToken extends NotAuthorized {

    constructor () {
        super();
        this.message = 'Token is expired.';
    }
}

exports.ExpiredToken = ExpiredToken;
