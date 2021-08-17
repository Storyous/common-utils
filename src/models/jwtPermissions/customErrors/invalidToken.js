'use strict';
const { NotAuthorized } = require('./notAuthorized');

class InvalidToken extends NotAuthorized {

    constructor (err) {
        super();
        this.message = 'Token is not valid.';
        this.data = err;
    }
}

exports.InvalidToken = InvalidToken;
