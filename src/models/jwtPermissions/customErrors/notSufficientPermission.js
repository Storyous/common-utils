'use strict';
const { NotAuthorized } = require('./notAuthorized');

class NotSufficientPermissions extends NotAuthorized {

    /**
     * @param {string[]} permissions
     */
    constructor (permissions) {
        super('Permissions are not sufficient for selected operation.', {
            permissions
        });
    }
}
exports.NotSufficientPermissions = NotSufficientPermissions;
