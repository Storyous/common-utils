'use strict';
const { NotAuthorized } = require('./notAuthorized');

class MissingToken extends NotAuthorized {

    constructor () {
        super('Token is missing');
    }
}

exports.MissingToken = MissingToken;
