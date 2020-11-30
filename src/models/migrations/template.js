'use strict';

const { Migration, getCollection } = require('@storyous/common-utils');

module.exports = new Migration('[ADD DESCRIPTION HERE]', async () => {

    // add logic here
    await getCollection('exampleCollection');
});
