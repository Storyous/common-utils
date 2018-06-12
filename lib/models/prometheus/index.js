'use strict';

const prometheusMiddlewares = require('./prometheusMiddlewares');


const prometheus = {

    middlewares: prometheusMiddlewares

};

module.exports = prometheus;
