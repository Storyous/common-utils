'use strict';

import { MongoClient } from 'mongodb';
import { defaultsDeep } from 'lodash';
// @ts-ignore
import { mongodbUrl, mongoOptions } from './config';

const mongoClient = new MongoClient(mongodbUrl, defaultsDeep(mongoOptions, {
    useUnifiedTopology: true
}));

export default mongoClient;
