'use strict';

import { Collection } from 'mongodb';
import mongoClient from './mongoClient';

export default <T>(name: string): Collection<T> => mongoClient.db().collection(name);
