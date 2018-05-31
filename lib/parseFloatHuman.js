'use strict';

/**
 * @param {string} value
 * @returns {number|null}
 */
function parseFloatHuman (value) {

    value = value.replace(/^[^0-9\-–+]*/, ''); // replace all non numbers and non sign from the front
    value = value.replace(/^–/, '-'); // replace long dash fot minus

    const minus = value.indexOf('-') === 0;

    value = value.replace(/[^0-9.,]/g, ''); // replace all non-number and non-dots and non-comma characters
    value = value.replace(/,/g, '.'); // all comma to dots
    value = value.replace(/\.(?=.*\.)/g, ''); // remove all dots but the last one

    if (value.trim() === '') {
        return null;
    }

    if (minus) {
        value = `-${value}`;
    }

    return parseFloat(value);
}

module.exports = parseFloatHuman;
