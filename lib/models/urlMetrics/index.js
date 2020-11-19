'use strict';

const data = new Map();

/**
 * Periodically log information about all used variables
 * @param log Logger
 * @param router Koa router
 * @param options
 */
exports.publishMetrics = (log, router, options = {
    publishIntervalInSeconds: 600,
    // if there are objectIds inside path, we need to replace them with some constant string
    replaceObjectIds: true
}) => {
    // this will be repeating periodically, we do not log every request to avoid too much unnecessary logs
    setInterval(() => {
        // we log each URL once so it can be grabbed by i.e. loggly charts later
        data.forEach((value, key) => log.info('URL was called', {
            url: key,
            count: value
        }));

        // once we logged it we can release the data
        data.clear();
    }, options.publishIntervalInSeconds * 1000);

    // Integration with Koa
    router.use(async (ctx, next) => {
        await next();
        let key = `${ctx.path}-${ctx.method}`;

        // The ctx.path can contain dynamic variables (i.e. ObjectId), but if everything goes as expected
        // there should be name of route used in last position (i.e. /:merchantPlaceId/settings)
        if (ctx.matched && ctx.matched.length > 0) {
            key = `${ctx.matched[ctx.matched.length - 1].path}-${ctx.method}`;
        }

        const getCount = data.get(key) || 0;
        data.set(key, getCount + 1);
    });
};
