const joi = require('joi');

const { InvalidInputError } = require('./permissionError');// eslint-disable-line import/order
/**
 * @typedef {
 *  Array<string>
 * } ParsedString
 *
 */

/**
 * @typedef {{
 *   b:string,
 *   h:string
 * }[]} ConversionTable
 *
 */

const conversionTable = [
    { b: '0000', h: '0' },
    { b: '0001', h: '1' },
    { b: '0010', h: '2' },
    { b: '0011', h: '3' },
    { b: '0100', h: '4' },
    { b: '0101', h: '5' },
    { b: '0110', h: '6' },
    { b: '0111', h: '7' },
    { b: '1000', h: '8' },
    { b: '1001', h: '9' },
    { b: '1010', h: 'A' },
    { b: '1011', h: 'B' },
    { b: '1100', h: 'C' },
    { b: '1101', h: 'D' },
    { b: '1110', h: 'E' },
    { b: '1111', h: 'F' },
];

/**
 *
 * @param {string} str
 * @param {number} size
 * @returns {ParsedString}
 */

function chunkSubstr (str, size) {
    const numChunks = Math.ceil(str.length / size);
    const chunks = new Array(numChunks);

    for (let i = 0, o = 0; i < numChunks; ++i, o += size) {
        chunks[i] = str.substr(o, size);
    }

    return chunks;
}

/**
 *
 * @param {string} data
 * @param {ConversionTable} table
 * @returns {string}
 */

function binaryToHex (data, table) {
    return table.find((i) => i.b === data)?.h || '0';

}

/**
 *
 * @param {string} data
 * @param {ConversionTable} table
 * @returns {string}
 */

function hexToBinary (data, table) {
    return table.find((i) => i.h === data)?.b;
}

/**
 *
 * @param {ParsedString} data
 * @param {ConversionTable} table
 * @returns {string}
 */

function convertArrayToHex (data, table) {
    let result = '';
    data.forEach((i) => {
        result += binaryToHex(i, table);
    });
    return result;
}

/**
 *
 * @param {ParsedString} data
 * @param {ConversionTable} table
 * @returns {string}
 */

function convertArrayToBinary (data, table) {
    let result = '';
    data.forEach((i) => {
        result += hexToBinary(i, table);
    });
    return result;
}
/**
 *
 * @param {string} input
 * @returns {string|function}
 */

function completeString (input) {
    return input.length % 4 === 0 ? input : completeString(input.concat('0'));
}

/**
 *
 * @param {string} data
 * @returns {ParsedString}
 */
function prepareData (data) {
    return chunkSubstr(completeString(data), 4);
}

/**
 *
 * @param {boolean[]} data
 * @returns {string}
 */

function convertBooleanArrayToString (data) {
    let result = '';
    data.forEach((i) => {
        result += i ? '1' : '0';
    });
    return result;
}
/**
 *
 * @param {string} data
 * @returns {boolean[]}
 */

function binaryStringToBooleanArray (data) {
    const parsedString = data.split('');
    return parsedString.map((i) => (i === '1'));

}

/**
 *
 * @param data
 */
function validateHexInput (data) {
    const regExp = new RegExp('^[0-9A-F]+$');
    if (!regExp.test(data)) throw new InvalidInputError(data);
}

/**
 *
 * @param data
 */

function validateBooleanString (data) {
    const schema = joi.array().items(joi.boolean());
    const validationResponse = schema.validate(data, { convert: false });
    if (validationResponse.error) {
        throw new InvalidInputError(data);
    }
}
/**
 *
 * @param {boolean[]} data
 * @returns {string}
 */
function encodeData (data) {
    validateBooleanString(data);
    return convertArrayToHex(prepareData(convertBooleanArrayToString(data)), conversionTable);
}
/**
 *
 * @param {string} data
 * @returns {boolean[]}
 */

function decodeData (data) {
    validateHexInput(data);
    const parsedString = data.split('');
    return binaryStringToBooleanArray(convertArrayToBinary(parsedString, conversionTable));
}
const permissionHelper={encodeData, decodeData }
module.exports = permissionHelper
