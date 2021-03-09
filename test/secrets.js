'use strict';

const { it, describe } = require('mocha');
const assert = require('assert');
const crypto = require('crypto');
const Secrets = require('../lib/secrets');


describe('secrets', () => {

    it('should be able to encrypt secret', () => {

        const password = 'someSecret';
        const challenge = 'someChallenge';

        const secrets = new Secrets(password);

        function decrypt (text) {
            const decipher = crypto.createDecipher('aes-256-cbc', password);
            let dec = decipher.update(text, 'hex', 'utf8');
            dec += decipher.final('utf8');
            return dec;
        }

        const encryptedChallenge = secrets.encryptLegacy(challenge);

        assert.equal(
            decrypt(encryptedChallenge),
            challenge,
            'encryptedChallenge should be encrypted by aes-256-cbc'
        );

        assert.equal(
            secrets.decrypt(encryptedChallenge),
            challenge,
            'encryptedChallenge should possible to decrypt by secrets.decrypt'
        );
    });

    it('should be able to encrypt and decrypt a secret', () => {

        const password = 'lbwyBzfgzUIvXZFShJuikaWvLJhIVq36';
        const plainText = 'someChallengeTextAaa';

        const secrets = new Secrets(password);

        const encryptedLegacy = secrets.encryptLegacy(plainText);
        const encrypted = secrets.encrypt(plainText);

        assert.strictEqual(secrets.decrypt(encryptedLegacy), plainText);
        assert.strictEqual(secrets.decrypt(encrypted), plainText);
    });

    it('should be compatible with PHP-generated secret', () => {
        const plainText = 'someChallengeTextAaa';
        const password = 'lbwyBzfgzUIvXZFShJuikaWvLJhIVq36';
        // eslint-disable-next-line max-len
        const encryptedByPHP = 'd9e52a175185520acf09e341288d8ebf_75d1cfe5600d4277c3ab6f1a628893ffb4b3c815c45f50758c6106121802adf9';

        const secrets = new Secrets(password);
        assert.strictEqual(secrets.decrypt(encryptedByPHP), plainText);
    });

});
