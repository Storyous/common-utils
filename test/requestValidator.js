'use strict';

const { describe, it } = require('mocha');
const assert = require('assert');
const validator = require('../dist/requestValidator');

describe('requestValidator', () => {

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

    describe('date', () => {

        it('should work', () => {

            // valid cases
            ['2018-08-03T14:59:46Z', '2018-08-03T14:59:46+0100'].forEach((date) => {
                assert((validator.date(date)) instanceof Date);
            });

            // invalid cases
            [
                '2018-08-03T14:59:46',
                '2018-08-03T14:59:46+0100X',
                '2013-99-99T04:13:00+00:00',
                '2018-02-31T14:59:46+0100'
            ].forEach((date) => {
                assert.throws(() => validator.date(date));
            });
        });
    });

});
