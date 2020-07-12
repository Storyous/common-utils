'use strict';

const { MongoClient } = require('mongodb');
const { defaultsDeep } = require('lodash');
const { mongodbUrl, mongoOptions = {} } = require('./config');

const mongoClient = new MongoClient(mongodbUrl, defaultsDeep(mongoOptions, {
    useUnifiedTopology: true
}));

module.exports = mongoClient;
