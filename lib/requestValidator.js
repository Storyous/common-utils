'use strict';

const AppError = require('./appError');
const { ObjectId } = require('mongodb');
const parseFloatHuman = require('./parseFloatHuman');

const requestValidator = {

    OBJECT_ID_REGEX: /^[a-f0-9]{24}$/i,
    EMAIL_REGEX: /^[^@\s]+@[^@\s]+\.[a-z]{2,10}$/i,
    USERNAME_REGEX: /^[a-z0-9_]+$/i,

    /**
     *
     * @param {*} value
     * @param {string} fieldName
     * @param {*|null} [defaultValue]
     * @param {boolean} [returnObjects]
     * @param {boolean} [allowNulls]
     * @returns {Array|null}
     */
    objectIdList (value, fieldName, defaultValue, returnObjects, allowNulls) {

        if (typeof value === 'string') {
            value = value.split(',');
        }

        if (defaultValue === true && arguments.length === 3) {
            defaultValue = undefined;
            returnObjects = true;
        }

        if (typeof value === 'object' && value instanceof Array) {

            value = value.map((el) => {

                if (allowNulls && (el === 'null' || el === null)) {
                    return null;

                } else if (!el.match(requestValidator.OBJECT_ID_REGEX)) {
                    throw AppError.badRequest(`A ${el} at ${fieldName} is not a ObjectId`);
                }

                return returnObjects ? new ObjectId(el) : el;
            });

        } else if (value) {
            throw AppError.badRequest(`Bad field list:  ${fieldName}`);

        } else {

            if (typeof defaultValue === 'undefined') {
                defaultValue = null;
            }

            value = defaultValue;
        }

        return value;
    },

    /**
     *
     * @param {*} value
     * @param {string} fieldName
     * @returns {string}
     */
    objectId (value, fieldName) {
        if (typeof value === 'string') {
            if (!value.match(requestValidator.OBJECT_ID_REGEX)) {
                throw AppError.badRequest(`A \`${value}\` at \`${fieldName}\` is not a ObjectId`);
            }
        } else if (value) {
            throw AppError.badRequest(`Bad \`${fieldName}\``);
        } else {
            value = null;
        }

        return value;
    },


    /**
     *
     * @param {*} value
     * @param {*} [defaultValue]
     * @returns {boolean}
     */
    boolean (value, defaultValue) {

        if (typeof value === 'boolean') {
            return value;

        } else if (typeof value === 'number') {
            return !!value;

        } else if (typeof value === 'string') {
            try {
                // 'true' and '1' => true... 'false' and '0' => false
                return !!JSON.parse(value);
            } catch (err) {}    // eslint-disable-line
        }

        if (typeof defaultValue === 'undefined') {
            defaultValue = null;
        }

        return defaultValue;
    },


    /**
     *
     * @param {*} value
     * @param {*} [defaultValue=null]
     * @param {string} [fieldName]
     */
    array (value, defaultValue, fieldName) {

        if (Array.isArray(value)) {
            return value;

        } else if (value != null) { // jshint ignore:line
            throw AppError.badRequest(`Bad field: '${fieldName}' has to be array`);
        }

        if (typeof value === 'undefined') {

            if (typeof defaultValue === 'undefined') {
                defaultValue = null;
            }

            value = defaultValue;
        }

        return value;
    },

    /**
     *
     * @param {*} value
     * @param {*|null} [defaultValue]
     * @param {string} [fieldName]
     * @param {{
     *   maxLength?: number
     *   minLength?: number
     *   trim?: boolean
     *   regexp?: RegExp
     * }} [options]
     * @returns {string|null}
     */
    string (value, defaultValue, fieldName, options = {}) {

        if (typeof value === 'number') {
            value = value.toString();
        }

        if (typeof value === 'string') {

            if (options.trim) {
                value = value.trim();
            }

            if (value) {
                value = requestValidator._validateStringRestrictions(value, fieldName, options);
            }

            if (value) { // empty strings will not pass
                return value;
            }
        }

        if (typeof defaultValue === 'undefined') {
            defaultValue = null;
        }

        return defaultValue;
    },

    /**
     * @param {*} value
     * @param {string} [fieldName]
     * @param {{
     *   maxLength?: number
     *   minLength?: number
     *   regexp?: RegExp
     * }} [options]
     */
    _validateStringRestrictions (value, fieldName, options = {}) {

        if (options.maxLength && value.length > options.maxLength) {
            throw AppError.badRequest(
                `Field \`${fieldName}\` can not be longer than ${options.maxLength} characters.`
            );
        }

        if (typeof options.minLength === 'number' && value.length < options.minLength) {
            throw AppError.badRequest(
                `Field \`${fieldName}\` can not be shorter than ${options.minLength} characters.`
            );
        }

        if (options.regexp && !value.match(options.regexp)) {
            throw AppError.badRequest(
                `Field \`${fieldName}\` should match to ${options.regexp.toString()} regular expression.`
            );
        }

        return value;
    },

    /**
     *
     * @param {*} value
     * @param {*|null} [defaultValue]
     * @returns {string|null}
     */
    object (value, defaultValue) {


        if (typeof value === 'object' && value !== null && !(value instanceof Array)) {
            return value;

        }

        if (typeof defaultValue === 'undefined') {
            defaultValue = null;
        }

        return defaultValue;
    },

    /**
     * Throws error, when the field is null
     *
     * @param {object} obj
     * @param {string} property
     * @param {string} [ofObject]
     */
    propFilled (obj, property, ofObject) {

        if (obj[property] === null) {

            if (ofObject) {
                ofObject = `of ${ofObject}`;
            }

            throw AppError.badRequest(`Field \`${property}\` ${(ofObject || '')} should be filled`);
        }
    },


    /**
     *
     * @param {*} value
     * @param {Array} array
     * @param {string} fieldName
     * @param {*|null} [defaultValue]
     * @returns {*|null}
     */
    _enum (value, array, fieldName, defaultValue) {
        let found = null;

        if (value === null || typeof value === 'undefined') {

            if (typeof defaultValue === 'undefined') {
                defaultValue = null;
            }

        } else {
            found = array.indexOf(value);
        }

        if (found === null) {
            return defaultValue;

        } else if (found >= 0) {
            return array[found];
        }

        throw AppError.badRequest(`Field '${fieldName}' is not matching any required value`);
    },

    /**
     *
     * @param {*} value
     * @param {Array} array
     * @param {boolean} strict
     * @param {string} fieldName
     * @param {*|null} [defaultValue]
     * @returns {*|null}
     */
    stringEnum (value, array, strict, fieldName, defaultValue) {

        if (!strict) {
            array = array.map((elem) => {
                if (elem !== null) {
                    elem = elem.toLowerCase();
                }
                return elem;
            });

            if (typeof value === 'string') {
                value = value.toLowerCase();
            }
        }

        return this._enum(value, array, fieldName, defaultValue);
    },

    /**
     *
     * @param {*} value
     * @param {*|null} [defaultValue]
     * @returns {Date|null}
     */
    date (value, defaultValue) {

        if (value instanceof Date) {
            return value;

        } else if (typeof value === 'number') {
            return new Date(value);

        } else if (typeof value === 'string' && value.length > 0) {
            let date;

            try {
                date = new Date(value); // can throw RangeError
            } catch (e) {
                throw AppError.badRequest(`A ${value} is not ISO date string`);
            }

            // NOTE temporary we force ISO format, until we decide for something else
            if (date.toISOString() !== value) {
                // value is some valid date string, but not ISO string
                throw AppError.badRequest(`A ${value} is not ISO date string`);
            }

            return date;

        }

        if (typeof defaultValue === 'undefined') {
            defaultValue = null;
        }

        return defaultValue;
    },

    /**
     *
     * @param {*} value
     * @param {*} [defaultValue=null]
     * @param {{ minValue?: number, maxValue?: number }} [options]
     * @returns {number} Or `defaultValue`
     */
    number (value, defaultValue, options = {}) {

        if (typeof value === 'string') {
            value = parseFloatHuman(value);
        }

        if (typeof value !== 'number') {

            if (typeof defaultValue === 'undefined') {
                defaultValue = null;
            }

            value = defaultValue;

        } else {
            if (typeof options.minValue === 'number' && value < options.minValue) {
                throw AppError.badRequest(`The value is lower than ${options.minValue}`);
            }

            if (typeof options.maxValue === 'number' && value > options.maxValue) {
                throw AppError.badRequest(`The value is greater than ${options.maxValue}`);
            }
        }

        return value;
    },

    /**
     *
     * @param {*} value
     * @param {*|null} [defaultValue]
     * @returns {string|null} - or default value
     */
    email (value, defaultValue = null) {

        if (typeof value === 'string' && value.length > 0) {

            if (!value.match(requestValidator.EMAIL_REGEX)) {
                throw AppError.badRequest('Email is not valid');
            }

            return value;
        }

        return defaultValue;
    },

    /**
     *
     * @param {Array} value
     * @param {Object} emptyObject - define values: mandatory: true, optional: false, defaultValue: null
     * @param {string} fieldName
     * @param {Function} [customValidationCallback]
     * @param {*} [thisArg]
     * @returns {Array|null}
     */
    setOfObjects (value, emptyObject, fieldName, customValidationCallback, thisArg) {

        if (!value) {
            return null;
        } else if (!(value instanceof Array)) {
            throw AppError.badRequest(`Field '${fieldName}' should be an array`);
        } else {
            return value.map(function (el) {
                if (typeof el !== 'object' || el instanceof Array) {
                    throw AppError.badRequest(`Array '${fieldName}' should contain only objects`);
                }
                let ret = {};

                for (const field in emptyObject) {

                    if (!Object.prototype.hasOwnProperty.call(emptyObject, field)) {
                        continue;
                    }

                    const fieldType = emptyObject[field];
                    const val = el[field];

                    if (typeof val !== 'undefined') { // value is present
                        ret[field] = val;
                    } else if (fieldType === true) { // mandatory field is missing
                        throw AppError.badRequest(`Object in '${fieldName}' should contain '${field}' field`);
                    } else if (fieldType !== false) { // use a default value
                        ret[field] = fieldType;
                    }
                }

                if (typeof customValidationCallback === 'function') {
                    // function can return new object, otherwise the other object is used
                    ret = customValidationCallback.call(thisArg || this, ret, fieldName) || ret;
                }

                return ret;
            });
        }
    }
};

module.exports = requestValidator;
