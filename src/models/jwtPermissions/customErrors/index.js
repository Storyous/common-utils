'use strict';
const { UserNotAuthorised } = require('./userNotAuthorised');
const { InvalidPermission } = require('./invalidPermissionError');
const { NotSufficientPermissions } = require('./notSufficientPermission');
const { InvalidToken } = require('./invalidToken');
const { ExpiredToken } = require('./expiredToken');

module.exports = {
    UserNotAuthorised, InvalidPermission, NotSufficientPermissions, InvalidToken, ExpiredToken
};
