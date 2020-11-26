'use strict';

const config = require('../../dist/config');

config._getDefaultConfigFile = () => `${__dirname}/values.config`;
config.init();

module.exports = config;
