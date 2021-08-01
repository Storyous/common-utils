'use strict';
import joi from 'joi';
import _  from 'lodash';
import  InvalidInputError  from './permissionError'; // eslint-disable-line import/order
/**
 *
 * @param {string} binaryString
 * @returns {boolean[]}
 */
function binaryStringToBooleanArray (binaryString:string) {
    const parsedString = binaryString.split('');
    return parsedString.map(i => (i === '1'));
}
/**
 *
 * @param {string} hexString
 */
function validateHexInput (hexString:string) {
    const regExp = new RegExp('^[0-9a-fA-F]+$');
    if (!regExp.test(hexString)) { throw new InvalidInputError(hexString); }
}
/**
 *
 * @param {boolean[]} booleanArray
 */
function validateBooleanArray (booleanArray:boolean[]) {
    const schema = joi.array().items(joi.boolean());
    const validationResponse = schema.validate(booleanArray, { convert: false });
    if (validationResponse.error) {
        throw new InvalidInputError(booleanArray);
    }
}
/**
 *
 * @param {boolean[]} booleanArray
 * @returns {string}
 */
function encodeData (booleanArray:boolean[]) {
    validateBooleanArray(booleanArray);
    return _.chunk(booleanArray, 4)
        .map((chunk) => {
            const binaryString = chunk.map((bool) => (bool ? '1' : '0'))
                .join('')
                .padEnd(4, '0');
            return parseInt(binaryString, 2)
                .toString(16);
        })
        .join('');
}
/**
 *
 * @param {string} hexString
 * @returns {boolean[]}
 */
function decodeData (hexString:string) {
    validateHexInput(hexString);

    const binaryString = _.chunk(hexString, 1)
        // @ts-ignore
        .map((char) => parseInt(char, 16)
            .toString(2).padStart(4, '0'))
        .join('');
    return binaryStringToBooleanArray(binaryString);
}
const permissionHelper = { encodeData, decodeData };
module.exports = permissionHelper;
export default  permissionHelper
