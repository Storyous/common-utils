'use strict';

const db = require('../models/db'); // eslint-disable-line


module.exports = {

    description: null,

    /**
     * Run the migration
     *
     * @param  {Function} next
     * @return void
     */
    up (next) {
        next();
    },

    /**
     * Reverse the migration
     *
     * @param  {Function} next
     * @return void
     */
    down (next) {
        next();
    }
};
