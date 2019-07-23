'use strict';

const getTestDatabase = require('./getTestDatabase');
const getMongoCachedJSONFetcher = require('../lib/getMongoCachedJSONFetcher');
const MockedServer = require('mocked-server');
const assert = require('assert');
const sinon = require('sinon');
const { it, describe, beforeEach } = require('mocha');


describe('getMongoCachedJSONFetcher', () => {

    function delay (milliseconds) {
        return new Promise(resolve => setTimeout(resolve, milliseconds));
    }

    const fileUrl = 'http://127.0.0.1:3011/file.json';

    let fileContent;

    const mockedFileServer = new MockedServer(fileUrl);
    let countOfRequests = 0;
    mockedFileServer.fileRoute = mockedFileServer.route('GET', '/file.json', (ctx) => {
        countOfRequests++;
        ctx.body = fileContent;
    });

    let collection;

    const cleanCache = () => collection.removeMany({});

    beforeEach(async () => {
        collection = (await getTestDatabase()).db.collection('cachedFiles');
        await cleanCache();
    });

    beforeEach(() => {
        countOfRequests = 0;
        fileContent = { version: 1 };
    });


    it('should fail when the first load fails', async () => {

        const fetchTheJson = getMongoCachedJSONFetcher(fileUrl, collection, {});

        mockedFileServer.handleNext('GET', '/file.json', (ctx) => {
            ctx.status = 500;
            ctx.body = { error: 'Some bad thing happen' };
        });

        await fetchTheJson()
            .then(
                () => {
                    throw Error('This should not happen.');
                },
                (err) => {
                    assert.equal(err.message, `No fresh JSON content available. Internal: URL fetch fail: ${fileUrl}`);
                }
            );


        mockedFileServer.runAllCheckers();

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

    it('should fetch the file only once for multiple parallel requests', async () => {

        const fetchTheJson = getMongoCachedJSONFetcher(fileUrl, collection, {
            cacheLifetime: 10000
        });

        mockedFileServer.fileRoute.handleNext(async (ctx, next) => {
            await delay(500);
            return next();
        });

        const promisedFile1 = fetchTheJson();
        const promisedFile2 = fetchTheJson();

        const [result1, result2] = await Promise.all([promisedFile1, promisedFile2]);
        assert.deepEqual(result1, fileContent);
        assert.deepEqual(result2, fileContent);
        assert(result1 !== result2, 'Reference on two results should not be the same.');
        assert.equal(countOfRequests, 1, 'There should be only one server call for parallel function calls.');

        await cleanCache();
        const promisedFile3 = await fetchTheJson();
        assert.deepEqual(promisedFile3, fileContent);
        assert.equal(countOfRequests, 2, 'There should be only one server call.');
    });

    it('should handle too long fetch requests and return old result', async () => {

        const version1Content = { version: 1 };
        const version2Content = { version: 2 };

        const timeout = 300;

        const fetchTheJson = getMongoCachedJSONFetcher(fileUrl, collection, {
            cacheLifetime: -1,
            timeout
        });

        fileContent = version1Content;
        await fetchTheJson(); // to fill the cache with version1Content for the test

        fileContent = version2Content;
        mockedFileServer.fileRoute.handleNext(async (ctx, next) => {
            await delay(1000); // let respond in very long time
            return next();
        });

        const start = Date.now();
        const result1 = await fetchTheJson();
        const duration = Date.now() - start;
        assert(duration < (timeout + 50), `Duration is greater than the limit, current value ${duration}`);

        assert.deepEqual(
            result1,
            version1Content,
            'Content should be served for even expired cache when the request was too long'
        );
        assert.equal(countOfRequests, 1, 'There should be only one server call.');

        await delay(1200); // let the request in background finish

        // let make the next request fail to see what is in the cache
        mockedFileServer.fileRoute.handleNext(async (ctx) => {
            ctx.status = 500;
            ctx.body = { error: 'some error' };
        });

        const result2 = await fetchTheJson();
        assert.deepEqual(
            result2,
            version2Content,
            'The cache should be filled with a fresh content once the request finishes in background.'
        );
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

        mockedFileServer.handleNext('GET', '/file.json', (ctx) => {
            ctx.status = 500;
            ctx.body = { error: 'Some bad thing happen' };
        });

        file = await fetchTheJson();
        assert.deepEqual(file, fileContent);

        mockedFileServer.runAllCheckers();

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

            mockedFileServer.handleNext('GET', '/file.json', (ctx) => {
                ctx.status = 500;
                ctx.body = { error: 'Some bad thing happen' };
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

            mockedFileServer.runAllCheckers();

            assert.equal(countOfRequests, 1, 'There should be only one server call to standard handler.');
        }
    );

    describe('transform option', () => {

        it('should use the function to map the JSON content', async () => {

            const transformedContent = {
                mappedFile: true
            };

            const transform = async (content) => {
                assert.deepEqual(content, fileContent);
                return transformedContent;
            };

            const fetchTheJson = getMongoCachedJSONFetcher(fileUrl, collection, {
                cacheLifetime: 10000,
                transform
            });

            const file = await fetchTheJson();
            assert.deepEqual(file, transformedContent);
        });

        it('should propagate exception when no cached version available and the call fails', async () => {

            const error = new Error('Error during transformation');

            const transform = () => {
                throw error;
            };

            const fetchTheJson = getMongoCachedJSONFetcher(fileUrl, collection, {
                cacheLifetime: 10000,
                transform
            });

            try {
                await fetchTheJson();
                throw new Error('This should not happend');

            } catch (err) {
                assert.equal(err, error);
            }

        });

        it('should use cached version when the function throws an exception', async () => {

            let called = false;

            const transformedContent = {
                mappedFile: true
            };

            const transform = sinon.spy(async (content) => {
                assert.deepEqual(content, fileContent);

                if (!called) {
                    called = true;
                    return transformedContent;
                }

                throw new Error('Error during transformation');
            });

            const fetchTheJson = getMongoCachedJSONFetcher(fileUrl, collection, {
                cacheLifetime: -1,
                transform
            });

            const firstResult = await fetchTheJson();
            assert.deepEqual(firstResult, transformedContent);

            const secondResult = await fetchTheJson();
            assert.deepEqual(secondResult, transformedContent);

            assert.equal(transform.callCount, 2, 'The transform should be called twice.');
        });

    });

});
