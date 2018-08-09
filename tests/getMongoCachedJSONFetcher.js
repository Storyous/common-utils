'use strict';

const getTestDatabase = require('./getTestDatabase');
const getMongoCachedJSONFetcher = require('../lib/getMongoCachedJSONFetcher');
const MockedServer = require('mocked-server');
const assert = require('assert');
const {
    it,
    describe,
    before,
    beforeEach,
    after,
    afterEach
} = require('mocha');


describe('getMongoCachedJSONFetcher', () => {

    const fileUrl = 'http://127.0.0.1:3011/file.json';

    let fileContent;

    let mockedFileServer;

    let collection;

    let countOfRequests = 0;

    before(async () => {
        collection = (await getTestDatabase()).db.collection('cachedFiles');
        await collection.removeMany({});
    });

    before((next) => {
        mockedFileServer = new MockedServer(fileUrl, next);
        mockedFileServer.handle('GET', '/file.json', (req, res) => {
            countOfRequests++;
            res.send(fileContent);
        });
    });

    beforeEach(() => {
        countOfRequests = 0;
        fileContent = { version: 1 };
    });

    afterEach((done) => {
        mockedFileServer.reset(done);
    });

    after((done) => {
        mockedFileServer.close(done);
    });


    it('should fail when the first load fails', async () => {

        const fetchTheJson = getMongoCachedJSONFetcher(fileUrl, collection, {});

        mockedFileServer.handleNext('GET', '/file.json', (req, res) => {
            res.status(500).send({ error: 'Some bad thing happen' });
        });

        await fetchTheJson()
            .then(
                () => {
                    throw Error('This should not happen.');
                },
                (err) => {
                    assert.equal(err.message, `Internal: URL fetch fail: ${fileUrl}`);
                }
            );


        mockedFileServer.assertAllNextHandlersProcessed();

        assert.equal(countOfRequests, 0, 'There should be no server call to standard handler.');
    });

    it('should fetch the file only once', async () => {

        const fetchTheJson = getMongoCachedJSONFetcher(fileUrl, collection, {
            cacheLifetime: 10000
        });

        let file = await fetchTheJson();
        assert.deepEqual(file, fileContent);

        file = await fetchTheJson();
        assert.deepEqual(file, fileContent);

        assert.equal(countOfRequests, 1, 'There should be only one server call.');
    });

    it('should fetch and cache fresh file after cache is old', async () => {

        const fetchTheJson = getMongoCachedJSONFetcher(fileUrl, collection, {
            cacheLifetime: -1
        });

        let file = await fetchTheJson();
        assert.deepEqual(file, fileContent);

        fileContent = { version: 2 };

        file = await fetchTheJson();
        assert.deepEqual(file, fileContent);

        assert.equal(countOfRequests, 2, 'There should be two server calls.');
    });

    it('should return cached version in case of fail of fetch', async () => {

        const fetchTheJson = getMongoCachedJSONFetcher(fileUrl, collection, {
            cacheLifetime: -1
        });

        let file = await fetchTheJson();
        assert.deepEqual(file, fileContent);

        mockedFileServer.handleNext('GET', '/file.json', (req, res) => {
            res.status(500).send({ error: 'Some bad thing happen' });
        });

        file = await fetchTheJson();
        assert.deepEqual(file, fileContent);

        mockedFileServer.assertAllNextHandlersProcessed();

        assert.equal(countOfRequests, 1, 'There should be only one server call to standard handler.');
    });

    it(
        'should NOT return cached version and throw error in case of fail of fetch and allowOldCache is false',
        async () => {

            const fetchTheJson = getMongoCachedJSONFetcher(fileUrl, collection, {
                cacheLifetime: -1
            });

            const file = await fetchTheJson();
            assert.deepEqual(file, fileContent);

            mockedFileServer.handleNext('GET', '/file.json', (req, res) => {
                res.status(500).send({ error: 'Some bad thing happen' });
            });

            await fetchTheJson(true)
                .then(
                    () => {
                        throw Error('This should not happen.');
                    },
                    (err) => {
                        assert.equal(
                            err.message,
                            `No fresh JSON content available. Internal: URL fetch fail: ${fileUrl}`
                        );
                    }
                );

            mockedFileServer.assertAllNextHandlersProcessed();

            assert.equal(countOfRequests, 1, 'There should be only one server call to standard handler.');
        }
    );

});
