'use strict';

const getTestDatabase = require('./getTestDatabase');
const mongoSearch = require('../lib/mongoSearch');
const mongodb = require('mongodb');
const assert = require('assert');

const {
    it,
    describe,
    before,
    beforeEach,
} = require('mocha');

class Product {
    /**
     * @param {string} name
     * @param {string|number|null} [sku=null]
     */
    constructor (name, sku = null) {
        this._id = new mongodb.ObjectId();
        this.name = name;
        this.sku = sku;
        this._search = mongoSearch.toIndexableArray(this.name, this.sku);
    }
}


describe.only('mongoSearch', () => {

    /**
     * @type {Collection}
     */
    let collection;

    const cleanDocuments = () => collection.removeMany({});

    /**
     * @param {string} name
     * @param {string|number|null} [sku=null]
     * @returns {Promise<void>}
     */
    const addProduct = async (name, sku) => {
        const product = new Product(name, sku);
        await collection.insertOne(product);
        return product;
    };

    before(async () => {
        collection = (await getTestDatabase()).db.collection('mongoSearchDocuments');
        collection.createIndex('_search');
    });

    beforeEach(cleanDocuments);

    it('should be able to filter and properly sort single matches', async () => {

        await addProduct('Banana', 'a1');
        const exoticOrange1 = await addProduct('exotic orange');
        const exoticOrange2 = await addProduct('orange  exotic');
        const orange = await addProduct(' Oránge', 'b2');

        const stages = mongoSearch.getSearchStages('oran');
        const results = await collection.aggregate(stages).toArray();

        assert.deepEqual(results, [
            orange,
            exoticOrange2,
            exoticOrange1
        ]);
    });

    it('should be able to filter multi-word search', async () => {

        await addProduct('Banana', 'a1');
        const redExoticOrange1 = await addProduct('RED exotic orange');
        await addProduct('BLUE orange  exotic');
        const redOrange = await addProduct(' RED Oránge', 'b2');

        const stages = mongoSearch.getSearchStages('oran red');
        const results = await collection.aggregate(stages).toArray();

        assert.deepEqual(results, [
            redOrange,
            redExoticOrange1
        ]);
    });


});
