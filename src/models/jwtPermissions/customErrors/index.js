'use strict';
const { UserNotAuthorised } = require('./userNotAuthorised');
const { InvalidPermission } = require('./invalidPermissionError');
const { MissingToken } = require('./missingToken');
const { NotSufficientPermissions } = require('./notSufficientPermission');
const { InvalidToken } = require('./invalidToken');

module.exports = {
    UserNotAuthorised, InvalidPermission, MissingToken, NotSufficientPermissions, InvalidToken
};
