'use strict';

const { it, describe } = require('mocha');
const assert = require('assert');
const ID = require('../lib/externalId');


describe('External Ids', () => {

    it('should be able to encode/decode external id', () => {

        const expectedPlain = '1231';
        const expectedEncoded = '7cW9wazJv';

        const encoded = ID.encode(expectedPlain);
        assert.equal(encoded, expectedEncoded);


        const decoded = ID.decode(encoded);
        assert.equal(decoded, expectedPlain);
    });

    it('should be able to encode/decode external id with prefix', () => {

        const expectedPlain = 140;
        const expectedEncoded = 'p:wZ2pycm5k';

        const encoded = ID.encode(expectedPlain, 'p');
        assert.equal(encoded, expectedEncoded);


        const decoded = ID.decode(encoded);
        assert.equal(decoded, expectedPlain);
    });

    it('should throw an AppError, when pass wrong argument', () => {
        assert.throws(() => (ID.encode('someString', 'p')), {});
    });
});
