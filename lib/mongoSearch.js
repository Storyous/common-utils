'use strict';

const { flatten } = require('lodash');
const escapeStringRegExp = require('escape-string-regexp');

/**
 * @see https://stackoverflow.com/questions/990904/remove-accents-diacritics-in-a-string-in-javascript#answer-37511463
 * @param {string} word
 * @returns {string}
 */
function removeAccents (word) {
    return word.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * @param {string} text
 * @returns {string[]}
 */
function textToWords (text) {
    return text.split(/\s+/).filter(word => word.length > 0);
}

/**
 * @param {...string} texts
 * @returns {string[]}
 */
function getNormalizedWords (...texts) {
    return flatten(texts.map(textToWords))
        .map(removeAccents)
        .map(word => word.toLowerCase());
}

const mongoSearch = {

    /**
     * @param {...(string|number|null|*)} texts
     * @returns {*}
     */
    toIndexableArray (...texts) {
        const strings = texts
            .map(word => (typeof word === 'number' ? word.toString() : word))
            .filter(word => typeof word === 'string'); // get rid of null etc.

        return getNormalizedWords(...strings);
    },

    /**
     * @param {string} searchedString
     * @param {string} [indexedArrayFieldName='_search']
     * @returns {Object[]}
     */
    getSearchStages (searchedString, indexedArrayFieldName = '_search') {

        const regExps = getNormalizedWords(searchedString)
            .map(word => new RegExp(`^${escapeStringRegExp(word)}`));

        const arrayIndexField = '___arrayIndex';
        const arraySizeField = '___arraySize';
        const unwindField = '___unwind';

        const getRegexMatchers = forFieldName => regExps.map(exp => ({ [forFieldName]: { $regex: exp } }));

        return [
            { $match: { $and: getRegexMatchers(indexedArrayFieldName) } }, // all words has to be present
            {
                $addFields: {
                    [arraySizeField]: { $size: `$${indexedArrayFieldName}` },
                    [unwindField]: `$${indexedArrayFieldName}`
                }
            },
            {
                $unwind: {
                    path: `$${unwindField}`,
                    includeArrayIndex: arrayIndexField, // we will sort by the first expression occurrence
                    preserveNullAndEmptyArrays: false
                }
            },
            { $match: { $or: getRegexMatchers(unwindField) } }, // filter only matches
            { $group: { _id: '$_id', document: { $first: '$$ROOT' } } }, // get first match
            { $replaceRoot: { newRoot: '$document' } }, // clean after $group
            {
                $sort: {
                    [arrayIndexField]: 1, // first occurrence wins
                    [arraySizeField]: 1, // shorten texts matches better
                    _id: -1 // consistent results
                }
            },
            {
                $project: { // clean up the result
                    [arrayIndexField]: false,
                    [unwindField]: false,
                    [arraySizeField]: false
                }
            }
        ];
    }

};

module.exports = mongoSearch;
