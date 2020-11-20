'use strict';

const { isObject } = require('lodash');

/**
 * Tracks the usage of URL calls or specific places in code in order to find the usage of these,
 * i.e. for find some deprecated parts of the code
 *
 * Example output
 *
 * info: usageTracker output {"additionalInfo":
 *   {"something":["efefef","efefefaefae"],"something2":["efefef"]},"name":"merchantSettings","count":3}
 * info: usageTracker output {"additionalInfo":{},"name":"/:merchantPlaceId/settings-PUT","count":1}
 */


/**
 * Each resource must have specific structure in order to process it.
 * This is factory method for initiation of new one
 * @return {{count: number, additionalInfo: {}}}
 */
const factoryEmptyData = () => ({
    // number of usage since last call
    count: 0,
    // additional data sent
    additionalInfo: new Map()
});

const data = new Map();
let _allowsObjectsInExtraData = false;

/**
 * Init the usage Tracker to periodically log information about usage
 *
 * @param {Logger} log Logger
 * @param {Object} options
 * @param {number} options.publishIntervalInSeconds How often we publish the metrics
 * @param {boolean} options.allowsObjectsInExtraData If true, you can store objects in additional metrics.
 *                                                   It can lead to logging enormous objects or even memory leak.
 * */
exports.init = (log, options = {
    publishIntervalInSeconds: 600,
    allowsObjectsInExtraData: false
}) => {
    _allowsObjectsInExtraData = options.allowsObjectsInExtraData;
    // this will be repeating periodically, we do not log every request to avoid too much unnecessary logs
    setInterval(() => {
        // for each unique name we have one log
        data.forEach((dataValue, dataKey) => {
            const additionalInfo = {};

            // Additional data are saved in Map and Set, we need to convert it to object and array to log it
            dataValue.additionalInfo.forEach((infoValue, infoKey) => {
                additionalInfo[infoKey] = Array.from(infoValue);
            });

            log.info('usageTracker output', {
                additionalInfo,
                name: dataKey,
                count: dataValue.count
            });
        });

        // once we logged it we can release the data
        data.clear();
    }, options.publishIntervalInSeconds * 1000);
};

/**
 * This part is required once in beginning of Koa middlewares.
 * It automatically watches all the URLs used
 * Usage:
 *
 * require {usageTracker, log} = require('@storyous/common-utils')
 * usageTracker.publishMetrics(log, app)
 *
 * @param router
 */
exports.watchUrlUsage = (router) => {
    // Integration with Koa
    router.use(async (ctx, next) => {
        await next();
        let key = `${ctx.path}-${ctx.method}`;

        // The ctx.path can contain dynamic variables (i.e. ObjectId), but if everything goes as expected
        // there should be name of route used in last position (i.e. /:merchantPlaceId/settings)
        if (ctx.matched && ctx.matched.length > 0) {
            key = `${ctx.matched[ctx.matched.length - 1].path}-${ctx.method}`;
        }

        const dataByKey = data.get(key) || factoryEmptyData();
        dataByKey.count++;
        data.set(key, dataByKey);
    });
};

/**
 * Add one call to the thing you are watching
 * @param name Name of the thing you want to track and the one you will find out in logs
 * @param metricName Additional metric name (i.e. some ID or version) you want to watch
 * @param metricValue The value of additional metric. Please use primitive types, NOT objects.
 *                    Otherwise the logs could be enormous or metric is not logged at all.
 */
exports.watchLineUsage = (name, metricName = null, metricValue = null) => {
    const dataByKey = data.get(name) || factoryEmptyData();

    // if metric exists, then to log it:
    // either metricValue is not object or it is object and the logging of it is allowed
    if (metricName && (!isObject(metricValue) || (isObject(metricValue) && _allowsObjectsInExtraData))) {
        if (!dataByKey.additionalInfo.get(metricName)) {
            dataByKey.additionalInfo.set(metricName, new Set());
        }
        dataByKey.additionalInfo.get(metricName)
            .add(metricValue);
    }

    dataByKey.count++;
    data.set(name, dataByKey);
};
