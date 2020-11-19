'use strict';

const { it, describe } = require('mocha');
const assert = require('assert');
const urlMetrics = require('../lib/models/urlMetrics');

const messages = [];
let routerUseMethod = null;

const fakeLog = {
    info: (message, obj) => {
        messages.push({
            message,
            obj
        });
    }
};

const fakeKoaRouter = {
    use: async (fn) => {
        routerUseMethod = fn;
    }
};

const wait = async (timeInMiliseconds) => {
    return new Promise((resolve) => setTimeout(resolve, timeInMiliseconds));
};

describe.only('urlMetrics', () => {
    it('should', async () => {
        urlMetrics.publishMetrics(fakeLog, fakeKoaRouter,
            {
                publishIntervalInSeconds: 0.001,
                // if there are objectIds inside path, we need to replace them with some constant string
                replaceObjectIds: true
            });

        routerUseMethod({
            path: '/5bd2d1d1bf21352ecc7f28a1-5bd2d1d1bf21352ecc7f28a2/settings',
            method: 'PUT',
            matched: [
                {
                    path: '/:merchantPlaceId/settings'
                }
            ]
        }, () => Promise.resolve());
        await wait(100);
        assert.equal(messages[0].message, 'URL was called');
        assert.equal(messages[0].obj.url, '/:merchantPlaceId/settings-PUT');
        assert.equal(messages[0].obj.count, 1);
    });
});
