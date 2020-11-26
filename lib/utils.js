'use strict';

/*
  Here you can save static methods and functions that you need
 */

const crypto = require('crypto');

/**
 * Generates random alphanumeric code*
 * @param {!number} num Number of characters
 * @returns {string} Random alphanumeric
 */
exports.generateRandomAlphanumeric = (num) => crypto.randomBytes(Math.ceil(num * (3 / 4)))
    // convert to base64 format
    .toString('base64')
    // return required number of characters
    .slice(0, num)
    // replace '+' with '0'
    .replace(/\+/g, '0')
    .replace(/\//g, '0');
