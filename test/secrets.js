'use strict';

const { it, describe } = require('mocha');
const assert = require('assert');
const crypto = require('crypto');
const Secrets = require('../dist/secrets');


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

        const encryptedChallenge = secrets.encrypt(challenge);

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
});
