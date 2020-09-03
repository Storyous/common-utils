'use strict';

const { db } = require('@storyous/common-utils');

module.exports = async (callback) => {

    const session = db.client.startSession();

    try {
        let result;

        await session.withTransaction(async () => {
            result = await callback(session);
        });

        return result;

    } finally {
        session.endSession();
    }
};
