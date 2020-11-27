'use strict';

const DUPLICATE_KEY_INSERT = 11000;
const DUPLICATE_KEY_UPDATE = 11001;

const mongoErrorCodes = {
    DUPLICATE_KEY_INSERT,
    DUPLICATE_KEY_UPDATE,
    DUPLICATE_KEY: [DUPLICATE_KEY_INSERT, DUPLICATE_KEY_UPDATE]
};

module.exports = mongoErrorCodes;
