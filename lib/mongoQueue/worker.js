'use strict';

const workerpool = require('workerpool');
const jobNames = require('./jobNames');

workerpool.worker({
    [jobNames.CONSUME_QUEUE]: () => {
        console.log('CONSUMING!!!!');
    }
});
