'use strict';

import { Collection } from 'mongodb';
import mongoClient from './mongoClient';

export default (name: string): Collection => mongoClient.db().collection(name);
