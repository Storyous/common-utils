'use strict';

const crypto = require('crypto');
const AppError = require('./appError');

class Secrets {

    /**
     * @param {string} password
     */
    constructor (password) {
        this._password = password;
    }

    /**
     * @param text
     * @returns {string}
     */
    encrypt (text) {
        const cipher = crypto.createCipher('aes-256-cbc', this._password);
        let crypted = cipher.update(text, 'utf8', 'hex');
        crypted += cipher.final('hex');
        return crypted;
    }

    /**
     * @param {string} encryptedText
     * @returns {string}
     * @throws {AppError}
     */
    decrypt (encryptedText) {
        try {
            const decipher = crypto.createDecipher('aes-256-cbc', this._password);
            let dec = decipher.update(encryptedText, 'hex', 'utf8');
            dec += decipher.final('utf8');
            return dec;
        } catch (error) {
            throw new AppError('Error when decrypting text.', error);
        }
    }

}

module.exports = Secrets;
