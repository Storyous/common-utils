'use strict';

const { describe, it } = require('mocha');
const assert = require('assert');
const { i18n } = require('../dist');


describe('i18n', () => {

    it('should translate a string', async () => {

        // USAGE:
        const t = i18n.getFixedT('cs');
        assert.strictEqual(
            t('testTranslation'),
            'czech aa'
        );
    });


});
