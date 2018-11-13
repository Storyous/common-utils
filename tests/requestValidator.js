'use strict';

const { describe, it } = require('mocha');
const assert = require('assert');
const validator = require('../lib/requestValidator');

describe.only('requestValidator', () => {

    describe('decimalNumber', () => {

        it('should work', () => {

            // default behaviour
            assert.equal(validator.decimalNumber(3), 3);
            assert.equal(validator.decimalNumber('3'), 3);
            assert.equal(validator.decimalNumber('3.15'), 3.15);
            assert.equal(validator.decimalNumber('3.156'), 3.16);

            // default value
            assert.equal(validator.decimalNumber(''), null);
            assert.equal(validator.decimalNumber('', 3), 3);

            // options
            assert.equal(validator.decimalNumber('3.156', null, { decimals: 3 }), 3.156);
            assert.throws(() => validator.decimalNumber('3.156', null, { maxValue: 3 }));
            assert.throws(() => validator.decimalNumber('3.156', null, { minValue: 5 }));
        });

    });

});
