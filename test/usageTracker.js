'use strict';

const { it, describe, before } = require('mocha');
const assert = require('assert');
const usageTracker = require('../dist/models/usageTracker');

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

const wait = async (timeInMiliseconds) => new Promise((resolve) => setTimeout(resolve, timeInMiliseconds));

describe('usageTracker', () => {
    before(() => {
        usageTracker.init(fakeLog,
            {
                publishIntervalInSeconds: 0.1
            });

        usageTracker.watchUrlUsage(fakeKoaRouter);
    });

    it('should push correct values in logs about url usage', async () => {
        routerUseMethod({
            path: '/5bd2d1d1bf21352ecc7f28a1-5bd2d1d1bf21352ecc7f28a2/settings',
            method: 'PUT',
            matched: [
                {
                    path: '/:merchantPlaceId/settings'
                }
            ]
        }, () => Promise.resolve());
        await wait(200);
        assert.equal(messages[0].message, 'usageTracker output');
        assert.equal(messages[0].obj.name, '/:merchantPlaceId/settings-PUT');
        assert.equal(messages[0].obj.count, 1);

        routerUseMethod({
            path: '/search/settings',
            method: 'GET',
            matched: [
            ]
        }, () => Promise.resolve());
        routerUseMethod({
            path: '/search/settings',
            method: 'GET',
            matched: [
            ]
        }, () => Promise.resolve());
        await wait(200);
        assert.equal(messages[1].message, 'usageTracker output');
        assert.equal(messages[1].obj.name, '/search/settings-GET');
        assert.equal(messages[1].obj.count, 2);
    });

    it('should push correct values in logs about line usage', async () => {
        usageTracker.watchLineUsage('something');
        await wait(200);
        assert.equal(messages[2].message, 'usageTracker output');
        assert.equal(messages[2].obj.name, 'something');
        assert.equal(messages[2].obj.count, 1);

        usageTracker.watchLineUsage('something2', 'metric', 'has this value');
        await wait(200);
        assert.equal(messages[3].message, 'usageTracker output');
        assert.equal(messages[3].obj.name, 'something2');
        assert.equal(messages[3].obj.additionalInfo.metric[0], 'has this value');
        assert.equal(messages[3].obj.count, 1);

        usageTracker.watchLineUsage('something3', 'metric', 'has this value');
        usageTracker.watchLineUsage('something3', 'metric', 'has this value');
        usageTracker.watchLineUsage('something3', 'metric', 'has this value2');
        usageTracker.watchLineUsage('something3', 'metric2', 'has this value3');
        await wait(200);
        assert.equal(messages[4].message, 'usageTracker output');
        assert.equal(messages[4].obj.name, 'something3');
        // Set does iterate in insertion order
        assert.equal(messages[4].obj.additionalInfo.metric[0], 'has this value');
        assert.equal(messages[4].obj.additionalInfo.metric[1], 'has this value2');
        assert.equal(messages[4].obj.additionalInfo.metric.length, 2);
        assert.equal(messages[4].obj.additionalInfo.metric2[0], 'has this value3');
        assert.equal(messages[4].obj.additionalInfo.metric2.length, 1);
        assert.equal(messages[4].obj.count, 4);
    });

    it('should not log objects in additional info', async () => {
        usageTracker.watchLineUsage('something4', 'metric', { random: 'object' });
        await wait(200);
        assert.equal(messages[5].message, 'usageTracker output');
        assert.equal(messages[5].obj.name, 'something4');
        assert.equal(messages[5].obj.additionalInfo.metric, undefined);
        assert.equal(messages[5].obj.count, 1);
    });
});
