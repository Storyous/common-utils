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
        const encryptedByPHP = 'r2DzE5n3c4R61mE/MZ2pEQ==:JcwiA6WXnQ54lGAiQ3oVU79wwpb+jTDoL786GhZVXzE=';

        const secrets = new Secrets(password);
        assert.strictEqual(secrets.decrypt(encryptedByPHP), plainText);
    });

});
