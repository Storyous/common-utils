'use strict';

const mongoClient = require('./mongoClient');

/**
 * @param {string} name
 * @returns {Collection}
 */
module.exports = (name) => mongoClient.db().collection(name);
