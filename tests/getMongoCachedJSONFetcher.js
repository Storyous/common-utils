'use strict';

const MockedServer = require('mocked-server');
const assert = require('assert');
const sinon = require('sinon');
const { it, describe, beforeEach } = require('mocha');
const crypto = require('crypto');
const { times } = require('lodash');
const getMongoCachedJSONFetcher = require('../lib/getMongoCachedJSONFetcher');
const getTestDatabase = require('./getTestDatabase');


describe('getMongoCachedJSONFetcher', () => {

    function delay (milliseconds) {
        return new Promise((resolve) => setTimeout(resolve, milliseconds));
    }

    function assertEtag (ctx, value) {
        assert.deepStrictEqual(ctx.get('If-None-Match'), value || '');
    }

    function getETagByContent (content) {
        const hash = crypto.createHash('sha1').update(JSON.stringify(content)).digest('base64');
        return `W/"${hash}"`;
    }

    const url = 'http://127.0.0.1:3011/file.json';

    let fileContent;

    const mockedFileServer = new MockedServer(url);
    let countOfRequests = 0;
    mockedFileServer.fileRoute = mockedFileServer.get('/file.json', (ctx) => {
        countOfRequests++;
        ctx.body = fileContent;
    });

    let collection;

    const cleanCache = () => collection.removeMany({});

    beforeEach(async () => {
        collection = (await getTestDatabase()).db.collection('cachedFiles');
        await collection.drop();
    });

    beforeEach(() => {
        countOfRequests = 0;
        fileContent = { version: 1 };
    });


    it('should fail when the first load fails', async () => {

        const fetchTheJson = await getMongoCachedJSONFetcher(collection, { url });

        mockedFileServer.fileRoute.handleNext((ctx) => {
            ctx.status = 500;
            ctx.body = { error: 'Some bad thing happen' };
        });

        await fetchTheJson()
            .then(
                () => {
                    throw Error('This should not happen.');
                },
                (err) => {
                    assert.equal(err.message, 'Response status 500 is not ok');
                    assert.deepStrictEqual(err.meta, {
                        request: {
                            method: 'GET',
                            url: 'http://127.0.0.1:3011/file.json'
                        },
                        response: {
                            body: '{"error":"Some bad thing happen"}',
                            status: 500
                        }
                    });
                }
            );


        mockedFileServer.runAllCheckers();

        assert.equal(countOfRequests, 0, 'There should be no server call to standard handler.');
    });

    it('should fetch the file only once', async () => {

        const fetchTheJson = await getMongoCachedJSONFetcher(collection, {
            url,
            cacheLifetime: 10000
        });

        const expected = {
            content: fileContent, etag: getETagByContent(fileContent), isCacheFresh: true, etagMatch: false
        };

        let result = await fetchTheJson();
        assert.deepStrictEqual(result, expected);

        result = await fetchTheJson();
        assert.deepStrictEqual(result, expected);

        assert.equal(countOfRequests, 1, 'There should be only one server call.');
    });

    it('should fetch the file only once for multiple parallel requests', async () => {

        const fetchTheJson = await getMongoCachedJSONFetcher(collection, {
            url,
            cacheLifetime: 10000
        });

        mockedFileServer.fileRoute.handleNext(async (ctx, next) => {
            await delay(500);
            return next();
        });

        const promisedFile1 = fetchTheJson();
        const promisedFile2 = fetchTheJson();

        const expectedResult = {
            content: fileContent, etag: getETagByContent(fileContent), isCacheFresh: true, etagMatch: false
        };

        const [result1, result2] = await Promise.all([promisedFile1, promisedFile2]);
        assert.deepStrictEqual(result1, expectedResult);
        assert.deepStrictEqual(result2, expectedResult);
        assert(result1.content !== result2.content, 'Reference on two results should not be the same.');
        assert.equal(countOfRequests, 1, 'There should be only one server call for parallel function calls.');

        await cleanCache();
        const promisedFile3 = await fetchTheJson();
        assert.deepStrictEqual(promisedFile3, expectedResult);
        assert.equal(countOfRequests, 2, 'There should be only one server call.');
    });

    it('should handle too long fetch requests and return old result', async () => {

        const version1Content = { version: 1 };
        const version2Content = { version: 2 };

        const timeout = 300;

        const fetchTheJson = await getMongoCachedJSONFetcher(collection, {
            url,
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

        assert.deepStrictEqual(
            result1,
            {
                content: version1Content, etag: getETagByContent(version1Content), isCacheFresh: false, etagMatch: false
            },
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
        assert.deepStrictEqual(
            result2,
            {
                content: version2Content, etag: getETagByContent(version2Content), isCacheFresh: false, etagMatch: false
            },
            'The cache should be filled with a isCacheFresh content once the request finishes in background.'
        );
    });

    it('should handle too long fetch requests and throw if no content cached', async () => {

        const timeout = 300;

        const fetchTheJson = await getMongoCachedJSONFetcher(collection, {
            url,
            timeout
        });

        mockedFileServer.fileRoute.handleNext(async (ctx, next) => {
            await delay(1000); // let respond in very long time
            return next();
        });

        const start = Date.now();
        await assert.rejects(fetchTheJson, /Cache refresh timed-out and there is no cached version to serve yet./);

        const duration = Date.now() - start;
        assert(duration < (timeout + 50), `Duration is greater than the limit, current value ${duration}`);

        await delay(1200); // let the request in background finish

        assert.equal(countOfRequests, 1, 'There should be only one server call.');

        // let make the next request fail to see what is in the cache
        mockedFileServer.fileRoute.handleNext(async (ctx) => {
            ctx.status = 500;
            ctx.body = { error: 'some error' };
        });

        const result2 = await fetchTheJson();
        assert.deepStrictEqual(
            result2,
            {
                content: fileContent, etag: getETagByContent(fileContent), isCacheFresh: false, etagMatch: false
            },
            'The cache should be filled with a isCacheFresh content once the request finishes in background.'
        );
    });

    it('should fetch and cache fresh file after cache is old', async () => {

        const fetchTheJson = await getMongoCachedJSONFetcher(collection, {
            url,
            cacheLifetime: -1
        });

        let result = await fetchTheJson();
        assert.deepStrictEqual(result, {
            content: fileContent, etag: getETagByContent(fileContent), isCacheFresh: true, etagMatch: false
        });

        fileContent = { version: 2 };

        result = await fetchTheJson();
        assert.deepStrictEqual(result, {
            content: fileContent, etag: getETagByContent(fileContent), isCacheFresh: true, etagMatch: false
        });

        assert.equal(countOfRequests, 2, 'There should be two server calls.');
    });

    it('should return cached version in case of fail of fetch', async () => {

        const fetchTheJson = await getMongoCachedJSONFetcher(collection, {
            url
        });

        let file = await fetchTheJson();
        assert.deepStrictEqual(file, {
            content: fileContent, etag: getETagByContent(fileContent), isCacheFresh: true, etagMatch: false
        });

        mockedFileServer.fileRoute.handleNext((ctx) => {
            ctx.status = 500;
            ctx.body = { error: 'Some bad thing happen' };
        });

        file = await fetchTheJson();
        assert.deepStrictEqual(file, {
            content: fileContent, etag: getETagByContent(fileContent), isCacheFresh: false, etagMatch: false
        });

        mockedFileServer.runAllCheckers();

        assert.equal(countOfRequests, 1, 'There should be only one server call to standard handler.');
    });

    describe('transform option', () => {

        it('should use the function to map the JSON content', async () => {

            const transformedContent = {
                mappedFile: true
            };

            const myKey = 'someId';

            const transform = async (content, key) => {
                assert.deepStrictEqual(content, fileContent);
                assert.strictEqual(key, myKey);
                return transformedContent;
            };

            const fetchTheJson = await getMongoCachedJSONFetcher(collection, {
                url,
                transform
            });

            const file = await fetchTheJson({ key: myKey });
            assert.deepStrictEqual(file, {
                content: transformedContent, isCacheFresh: true, etag: getETagByContent(fileContent), etagMatch: false
            });
        });

        it('should log exception when no cached version available and the call fails', async () => {

            const error = new Error('Error during transformation.');

            const transform = () => {
                throw error;
            };

            let loggedError = null;

            const fetchTheJson = await getMongoCachedJSONFetcher(collection, {
                url,
                transform,
                logError: (err) => { loggedError = err; }
            });

            try {
                await fetchTheJson();
                throw new Error('This should not happend');

            } catch (err) {
                assert.equal(err.message, 'Error during transformation.');
                assert.equal(loggedError, error);
            }

        });

        it('should use cached version when the function throws an exception', async () => {

            let called = false;

            const updatedFile = { version: 2 };

            const transformedContent = {
                mappedFile: true
            };

            const transform = sinon.spy(async (content) => {

                if (!called) {
                    assert.deepStrictEqual(content, fileContent);
                    called = true;
                    return transformedContent;
                }

                assert.deepStrictEqual(content, updatedFile);
                throw new Error('Error during transformation');
            });

            const fetchTheJson = await getMongoCachedJSONFetcher(collection, {
                url,
                transform
            });

            const firstResult = await fetchTheJson();
            assert.deepStrictEqual(firstResult, {
                content: transformedContent, etag: getETagByContent(fileContent), isCacheFresh: true, etagMatch: false
            });


            mockedFileServer.fileRoute.handleNext((ctx) => {
                ctx.body = updatedFile;
            });

            const secondResult = await fetchTheJson();
            assert.deepStrictEqual(secondResult, {
                content: transformedContent, etag: getETagByContent(fileContent), isCacheFresh: false, etagMatch: false
            });

            assert.equal(transform.callCount, 2, 'The transform should be called twice.');
        });

    });

    describe('etag', () => {

        it('should serve cached content if remote etag match', async () => {

            const fetchTheJson = await getMongoCachedJSONFetcher(collection, { url });

            const etag = '111';

            mockedFileServer.fileRoute.handleNext((ctx, next) => {
                assertEtag(ctx, null);
                ctx.set('ETag', etag);
                return next();
            });
            let result = await fetchTheJson();
            assert.deepStrictEqual(result, {
                content: fileContent, etag, isCacheFresh: true, etagMatch: false
            });

            mockedFileServer.fileRoute.handleNext((ctx) => {
                assertEtag(ctx, etag);
                ctx.body = null;
                ctx.status = 304;
            });
            result = await fetchTheJson();
            assert.deepStrictEqual(result, {
                content: fileContent, etag, isCacheFresh: true, etagMatch: false
            });
        });

        it('should cache and serve new content if etag does not match', async () => {

            const fetchTheJson = await getMongoCachedJSONFetcher(collection, { url });

            const etag1 = '111';
            const etag2 = '222';

            mockedFileServer.fileRoute.handleNext((ctx, next) => {
                assertEtag(ctx, null);
                ctx.set('ETag', etag1);
                return next();
            });
            let result = await fetchTheJson();
            assert.deepStrictEqual(result, {
                content: fileContent, etag: etag1, isCacheFresh: true, etagMatch: false
            });

            const updatedFileContent = { version: 2 };
            mockedFileServer.fileRoute.handleNext((ctx) => {
                assertEtag(ctx, etag1);
                ctx.set('ETag', etag2);
                ctx.body = updatedFileContent;
            });
            result = await fetchTheJson();
            assert.deepStrictEqual(result, {
                content: updatedFileContent, etag: etag2, isCacheFresh: true, etagMatch: false
            });

            mockedFileServer.fileRoute.handleNext((ctx) => {
                ctx.status = 500;
                ctx.body = { error: 'Some bad thing happen' };
            });
            result = await fetchTheJson();
            assert.deepStrictEqual(result, {
                content: updatedFileContent, etag: etag2, isCacheFresh: false, etagMatch: false
            });
        });

        it('should be able to cache content once etag is not supported even before was', async () => {

            const fetchTheJson = await getMongoCachedJSONFetcher(collection, { url });

            const etag1 = '111';

            mockedFileServer.fileRoute.handleNext((ctx, next) => {
                assertEtag(ctx, null);
                ctx.set('ETag', etag1);
                return next();
            });
            let result = await fetchTheJson();
            assert.deepStrictEqual(result, {
                content: fileContent, etag: etag1, isCacheFresh: true, etagMatch: false
            });

            const updatedFileContent = { version: 2 };
            mockedFileServer.fileRoute.handleNext((ctx) => {
                assertEtag(ctx, etag1);
                // no etag sent back
                ctx.body = updatedFileContent;
            });
            result = await fetchTheJson();
            assert.deepStrictEqual(result, {
                content: updatedFileContent,
                etag: getETagByContent(updatedFileContent),
                isCacheFresh: true,
                etagMatch: false
            });

            mockedFileServer.fileRoute.handleNext((ctx) => {
                ctx.status = 500;
                ctx.body = { error: 'Some bad thing happen' };
            });
            result = await fetchTheJson();
            assert.deepStrictEqual(result, {
                content: updatedFileContent,
                etag: getETagByContent(updatedFileContent),
                isCacheFresh: false,
                etagMatch: false
            });
        });

        it('should calculate etag if no is provided', async () => {

            const fetchTheJson = await getMongoCachedJSONFetcher(collection, {
                url,
                cacheLifetime: 10000
            });

            const calculatedEtag = getETagByContent(fileContent);

            const expected = {
                content: fileContent, etag: calculatedEtag, isCacheFresh: true, etagMatch: false
            };

            let result = await fetchTheJson();
            assert.deepStrictEqual(result, expected);

            result = await fetchTheJson();
            assert.deepStrictEqual(result, expected);

            assert.equal(countOfRequests, 1, 'There should be only one server call.');
        });

        it('should not call transform function if returned etag matches', async () => {


            const transformedContent = { mappedFile: true };

            const transform = sinon.spy(async (content, key) => {
                assert.deepStrictEqual(content, fileContent);
                assert.strictEqual(key, url);
                return transformedContent;
            });

            const fetchTheJson = await getMongoCachedJSONFetcher(collection, {
                url,
                transform
            });

            const returnedEtag = '1178657';

            times(2, () => mockedFileServer.fileRoute.handleNext((ctx, next) => {
                ctx.set('ETag', returnedEtag);
                return next();
            }));

            const expected = {
                content: transformedContent, etag: returnedEtag, isCacheFresh: true, etagMatch: false
            };

            let result = await fetchTheJson();
            assert.deepStrictEqual(result, expected);

            result = await fetchTheJson();
            assert.deepStrictEqual(result, expected);

            assert.strictEqual(countOfRequests, 2, 'There should be two server call.');
            assert.strictEqual(transform.callCount, 1, 'There should be only on transform function call');

        });

        it('should not call transform function if calculated etag matches', async () => {

            const transformedContent = {
                mappedFile: true
            };

            const transform = sinon.spy(async (content, key) => {
                assert.deepStrictEqual(content, fileContent);
                assert.strictEqual(key, url);
                return transformedContent;
            });

            const fetchTheJson = await getMongoCachedJSONFetcher(collection, {
                url,
                transform
            });

            const calculatedEtag = getETagByContent(fileContent);

            const expected = {
                content: transformedContent, etag: calculatedEtag, isCacheFresh: true, etagMatch: false
            };

            let result = await fetchTheJson();
            assert.deepStrictEqual(result, expected);

            result = await fetchTheJson();
            assert.deepStrictEqual(result, expected);

            assert.strictEqual(countOfRequests, 2, 'There should be two server call.');
            assert.strictEqual(transform.callCount, 1, 'There should be only on transform function call');
        });

    });

    describe('ifNoneMatch', () => {

        function testResults (etag, resultWithoutEtag, resultWithWrongEtag, resultWithEtag) {
            assert.deepStrictEqual({
                resultWithoutEtag,
                resultWithWrongEtag,
                resultWithEtag
            }, {
                resultWithoutEtag: {
                    content: fileContent, etag, isCacheFresh: true, etagMatch: false
                },
                resultWithWrongEtag: {
                    content: fileContent, etag, isCacheFresh: true, etagMatch: false
                },
                resultWithEtag: {
                    content: null, etag, isCacheFresh: true, etagMatch: true
                }
            });
        }

        function serveWithEtag (expectedIfNoneMatch, etag) {
            return mockedFileServer.fileRoute.handleNext((ctx, next) => {
                assertEtag(ctx, expectedIfNoneMatch);
                ctx.set('ETag', etag);
                return next();
            });
        }

        it('should properly respond in case of NO cached content', async () => {

            const fetchTheJson = await getMongoCachedJSONFetcher(collection, { url });
            const etag = '111';

            serveWithEtag(null, etag);

            // intentional parallel call, there should be only one call to server despite different result
            const [resultWithoutEtag1, resultWithWrongEtag1, resultWithEtag1] = await Promise.all([
                fetchTheJson(),
                fetchTheJson({ ifNoneMatch: 'unknownEtag' }),
                fetchTheJson({ ifNoneMatch: etag })
            ]);

            assert.equal(countOfRequests, 1);
            testResults(etag, resultWithoutEtag1, resultWithWrongEtag1, resultWithEtag1);

            // let's test reverted call order, the result should be the same,
            // it'll exclude option of order-dependent bug
            await cleanCache();
            countOfRequests = 0;
            serveWithEtag(null, etag);

            const [resultWithEtag2, resultWithWrongEtag2, resultWithoutEtag2] = await Promise.all([
                fetchTheJson({ ifNoneMatch: etag }),
                fetchTheJson({ ifNoneMatch: 'unknownEtag' }),
                fetchTheJson()
            ]);

            assert.equal(countOfRequests, 1);
            testResults(etag, resultWithoutEtag2, resultWithWrongEtag2, resultWithEtag2);
        });

        it('should properly respond in case of cached content', async () => {

            const fetchTheJson = await getMongoCachedJSONFetcher(collection, { url });
            const etag = '111';

            // let's cache the content
            serveWithEtag(null, etag);
            await fetchTheJson();
            countOfRequests = 0;

            serveWithEtag(etag, etag);
            // intentional parallel call, there should be only one call to server despite different result
            const [resultWithoutEtag1, resultWithWrongEtag1, resultWithEtag1] = await Promise.all([
                fetchTheJson(),
                fetchTheJson({ ifNoneMatch: 'unknownEtag' }),
                fetchTheJson({ ifNoneMatch: etag })
            ]);

            assert.equal(countOfRequests, 1);
            testResults(etag, resultWithoutEtag1, resultWithWrongEtag1, resultWithEtag1);

            // let's test reverted call order, the result should be the same,
            // it'll exclude option of order-dependent bug
            serveWithEtag(etag, etag);
            countOfRequests = 0;

            const [resultWithEtag2, resultWithWrongEtag2, resultWithoutEtag2] = await Promise.all([
                fetchTheJson({ ifNoneMatch: etag }),
                fetchTheJson({ ifNoneMatch: 'unknownEtag' }),
                fetchTheJson()
            ]);

            assert.equal(countOfRequests, 1);
            testResults(etag, resultWithoutEtag2, resultWithWrongEtag2, resultWithEtag2);
        });

    });

    describe('metaOnly flag', () => {

        it('should return meta only', async () => {

            const fetchTheJson = await getMongoCachedJSONFetcher(collection, { url });

            const result = await fetchTheJson({ metaOnly: true });
            assert.deepStrictEqual(result, {
                content: null, etag: getETagByContent(fileContent), isCacheFresh: true, etagMatch: false
            });
        });

    });

});
