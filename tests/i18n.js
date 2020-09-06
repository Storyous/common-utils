'use strict';

const { describe, it, after } = require('mocha');
const assert = require('assert');
const { mkdirSync, writeFileSync, rmdirSync } = require('fs');
const { join } = require('path');


describe('i18n', () => {

    const translationsPath = join(process.cwd(), 'translations');

    after(() => {
        rmdirSync(translationsPath, { recursive: true });
    });

    it('should translate a string', async () => {

        mkdirSync(translationsPath, { recursive: true });
        const translatedText = 'czech aa';

        writeFileSync(join(translationsPath, 'cs.json'), JSON.stringify({
            testTranslation: translatedText
        }));

        // USAGE:
        // eslint-disable-next-line global-require
        const i18n = require('../lib/i18n'); // load the service after the language file exists
        const t = i18n.getFixedT('cs');
        assert.strictEqual(
            t('testTranslation'),
            translatedText
        );
    });


});
