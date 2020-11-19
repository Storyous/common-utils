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
        // basically path = ctx.path, but lint does not like that
        let { path } = ctx;

        if (options.replaceObjectIds) {
            path = path
                // we evalue each part of path separately
                .split('/')
                .map(
                    // if the beginning of path is objectId, we replace it with constant
                    (urlPart) => (urlPart.substring(0, 24)
                        .match(/^[0-9a-fA-F]{24}$/) ? 'objectId' : urlPart))
                // and then join it back together
                .join('/');
        }

        // method is included in key because it can happen i.e. PUT method is deprecated and not used while GET
        // is still used a lot
        const key = `${path}-${ctx.method}`;
        const getCount = data.get(key) || 0;
        data.set(key, getCount + 1);

        await next();
    });
};
