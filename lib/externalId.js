'use strict';

const AppError = require('../lib/appError');

module.exports = {
    /**
     * Encode external id
     * @param {number} number
     * @param {?string} prefix
     * @returns {string}
     */
    encode (number, prefix = '') {
        const mod = number % 36;

        if (Number.isNaN(mod) || String(number).length > 16 || Number(number) < 1) {
            throw new AppError('Invalid input number');
        }

        let res = ((number + 9876543) * (73 - mod)).toString(30);
        while (res.length % 3 !== 0) {
            res = `0${res}`;
        }

        if (prefix) {
            prefix = `${prefix}:`;
        }
        return prefix + mod.toString(36) + Buffer.from(res).toString('base64');
    },

    /**
     * Decode external id
     * @param {string} code
     * @returns {number}
     */
    decode (code) {
        if (code.includes(':')) {
            [, code] = code.split(':');
        }

        const mod = parseInt(code[0], 36);
        const ascii = Buffer.from(code.substr(1), 'base64').toString('ascii');
        const number = (parseInt(ascii, 30) / (73 - mod)) - 9876543;

        if (Math.round(number) !== number) {
            throw new AppError('Invalid code');
        }
        return number;
    }
};
