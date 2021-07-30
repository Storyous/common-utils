const { it, describe } = require('mocha');
const assert = require('assert');
const {
    validArrayInputs, invalidArrayInputs, expectedHexResult, expectedArrayResult, invalidHexInputs,
} = require('./permissionsMockData');
const { encodeData, decodeData } = require('../src/models/permissions/permissionHelper');

describe('Encoding functionality', () => {
    describe('Testing encoding function', () => {
        it('Should encode to hex', async () => {

            validArrayInputs.forEach((item, index) => {
                const response = encodeData(item);
                assert.deepStrictEqual(response, expectedHexResult[index]);
            });
        });
        it('Should fail on invalid input', async () => {
            invalidArrayInputs.forEach((item) => {
                assert.throws(() => encodeData(item), {
                    message: 'Invalid input',
                    name: 'Error',
                });
            });
        });
    });

    describe('Testing decoding function', () => {
        it('Should decode to boolean array', async () => {

            expectedHexResult.forEach((item, index) => {
                const response = decodeData(item);
                assert.deepStrictEqual(response, expectedArrayResult[index]);
            });
        });
        it('Should fail on invalid input', async () => {
            invalidHexInputs.forEach((item) => {
                assert.throws(() => decodeData(item), {
                    message: 'Invalid input',
                    name: 'Error',
                });
            });
        });
    });
});
