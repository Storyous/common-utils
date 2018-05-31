'use strict';

const { describe, it } = require('mocha');
const assert = require('assert');

const config = require('../lib/config');

describe('Configurator', function() {

    describe('#initialize()', function() {

        it('should fill env property', function () {

            config.init();
            assert.notEqual(config.env, null, 'env should not be empty');

        });
    });

    describe('#_merge()', function() {

        it('should be able to merge two objects', function () {

            const defaults = {
                fillWithObject: null,
                toBeCleared: { some: 1 },
                toBeKept: 'abc',
                toBeMerged: {
                    keepObj: { some: 1 },
                    keepScalar: 'hi',
                    nullMe: 'foo',
                    replaceMe: 'old'
                }
            };

            const newObject = {
                fillWithObject: { bar: 2 },
                toBeCleared: null,
                toBeMerged: {
                    nullMe: null,
                    replaceMe: 'new'
                }
            };

            config._merge(newObject, defaults);

            const expected = {
                fillWithObject: { bar: 2 },
                toBeCleared: null,
                toBeKept: 'abc',
                toBeMerged: {
                    keepObj: { some: 1 },
                    keepScalar: 'hi',
                    nullMe: null,
                    replaceMe: 'new'
                }
            };

            assert.deepEqual(defaults, expected, 'should be equal');

        });
    });

});
