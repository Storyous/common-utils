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
    encryptLegacy (text) {
        const cipher = crypto.createCipher('aes-256-cbc', this._password);
        let crypted = cipher.update(text, 'utf8', 'hex');
        crypted += cipher.final('hex');
        return crypted;
    }

    /**
     * @param text
     * @returns {string}
     */
    encrypt (text) {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-cbc', this._password, iv);
        let crypted = cipher.update(text, 'utf8', 'base64');
        crypted += cipher.final('base64');
        return `${iv.toString('base64')}:${crypted}`;
    }

    /**
     * @param {string} encryptedText
     * @returns {string}
     * @throws {AppError}
     */
    _decryptLegacy (encryptedText) {
        try {
            const decipher = crypto.createDecipher('aes-256-cbc', this._password);
            let dec = decipher.update(encryptedText, 'hex', 'utf8');
            dec += decipher.final('utf8');
            return dec;
        } catch (error) {
            throw new AppError('Error when decrypting text.', error);
        }
    }

    /**
     * @param {string} encryptedText
     */
    decrypt (encryptedText) {
        const parts = encryptedText.split(':');
        if (parts.length === 1) {
            return this._decryptLegacy(encryptedText);
        }
        try {
            const [ivText, encryptedTextOnly] = parts;
            const iv = Buffer.from(ivText, 'base64');
            const decipher = crypto.createDecipheriv('aes-256-cbc', this._password, iv);
            let dec = decipher.update(encryptedTextOnly, 'base64', 'utf8');
            dec += decipher.final('utf8');
            return dec;
        } catch (error) {
            throw new AppError('Error when decrypting text.', error);
        }
    }

}

module.exports = Secrets;
