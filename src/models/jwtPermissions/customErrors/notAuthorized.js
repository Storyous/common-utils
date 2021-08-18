'use strict';
const AppError = require('../../../appError');

class NotAuthorized extends AppError {

    constructor () {
        super('Not authorized.', {
            httpStatus: 401,
            code: 401
        });

    }
}
exports.NotAuthorized = NotAuthorized;
