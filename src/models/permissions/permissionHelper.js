
const joi = require('joi');
const _ = require('lodash');
const { InvalidInputError } = require('./permissionError'); // eslint-disable-line import/order

/**
 *
 * @param {string} binaryString
 * @returns {boolean[]}
 */
function binaryStringToBooleanArray(binaryString) {
    const parsedString = binaryString.split('');
    return parsedString.map((i) => (i === '1'));
}
/**
 *
 * @param {string} hexString
 */
function validateHexInput(hexString) {
    const regExp = new RegExp('^[0-9a-fA-F]+$');
    if (!regExp.test(hexString))
        throw new InvalidInputError(hexString);
}
/**
 *
 * @param {boolean[]} booleanArray
 */
function validateBooleanArray(booleanArray) {
    const schema = joi.array().items(joi.boolean());
    const validationResponse = schema.validate(booleanArray, { convert: false });
    if (validationResponse.error) {
        throw new InvalidInputError(booleanArray);
    }
}
/**
 *
 * @param {boolean[]} data
 * @returns {string}
 */
function encodeData(booleanArray) {
    validateBooleanArray(booleanArray);
    const res = _.chunk(booleanArray, 4)
        .map(chunk => {
            const binaryString = chunk.map(bool => bool ? '1' : '0')
                .join('')
                .padEnd(4, '0');
            return parseInt(binaryString, 2)
                .toString(16);
        })
        .join('');
    return res
}

/**
 *
 * @param {string} data
 * @returns {boolean[]}
 */
function decodeData(hexString) {
    validateHexInput(hexString);
    const binaryString = _.chunk(hexString, 1)
        .map(char => {

            return parseInt(char, 16)
                .toString(2).padStart(4,"0")
        })
        .join('');
    return binaryStringToBooleanArray(binaryString);
}
const permissionHelper = { encodeData, decodeData };
module.exports = permissionHelper;
