'use strict';

const client = require('prom-client');
const register = new client.Registry();

module.exports = register;
