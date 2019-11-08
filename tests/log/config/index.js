'use strict';

const config = require('../../../lib/config');

config._getDefaultConfigFile = () => `${__dirname}/values.config`;
config.init();

module.exports = config;
