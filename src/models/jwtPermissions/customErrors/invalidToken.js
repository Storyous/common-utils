'use strict';
const { NotAuthorized } = require('./notAuthorized');

class InvalidToken extends NotAuthorized {

    constructor (err) {
        super('Token is not valid', { err }
        );
    }
}

exports.InvalidToken = InvalidToken;
