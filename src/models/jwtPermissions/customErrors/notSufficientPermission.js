'use strict';
const AppError = require('../../../appError');

class NotSufficientPermissions extends AppError {

    constructor () {
        super('Not sufficient permissions.', {
            httpStatus: 403,
            code: 403
        });

    }
}
exports.NotSufficientPermissions = NotSufficientPermissions;
