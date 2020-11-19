'use strict';

const { it, describe } = require('mocha');
const urlMetrics = require('../lib/models/urlMetrics');

const messages = [];
let routerUseMethod = null;

const fakeLog = {
    info: (message) => {
        messages.push(message);
    }
};

const fakeKoaRouter = {
    use: async (fn) => {
        routerUseMethod = fn;
    }
};

const wait = async (timeInMiliseconds) => {
    return new Promise((resolve) => setTimeout(resolve, timeInMiliseconds));
}

describe('urlMetrics', () => {
    it('should', async () => {
        urlMetrics.publishMetrics(fakeLog, fakeKoaRouter,
            {
                publishIntervalInSeconds: 0.001,
                // if there are objectIds inside path, we need to replace them with some constant string
                replaceObjectIds: true
            });

        routerUseMethod({ path: '/{{merchantId}}-{{placeId}}/settings' }, Promise.resolve());

        await wait(100);
    });
});
