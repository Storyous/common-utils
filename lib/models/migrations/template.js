'use strict';

const { Migration, collection } = require('@storyous/common-utils');

module.exports = new Migration('[ADD DESCRIPTION HERE]', async () => {

    // add logic here
    await collection('exampleCollection');
});
