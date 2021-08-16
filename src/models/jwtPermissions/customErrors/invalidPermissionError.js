'use strict';
const AppError = require('../../../appError');

class InvalidPermissionError extends AppError {

    /**
     * @param {{name:string, enabled:boolean}} permission
     */
    constructor (permission) {
        super('Invalid permission.', {
            httpStatus: 422,
            code: 422,
            permission
        });
    }
}
exports.InvalidPermissionError = InvalidPermissionError;
