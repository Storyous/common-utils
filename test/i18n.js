'use strict';

const { describe, it, after } = require('mocha');
const assert = require('assert');
const { mkdirSync, writeFileSync, existsSync, lstatSync, readdirSync, unlinkSync, rmdirSync } = require('fs');
const { join } = require('path');

// Taken from
// https://geedew.com/remove-a-directory-that-is-not-empty-in-nodejs/
// eslint-disable-next-line
// https://stackoverflow.com/questions/12627586/is-node-js-rmdir-recursive-will-it-work-on-non-empty-directories/12761924#12761924
// The Node 10 does not support resurive deleting of folder
const deleteFolderRecursive = function (path) {
    let files = [];
    if (existsSync(path)) {
        files = readdirSync(path);
        files.forEach((file) => {
            const curPath = `${path}/${file}`;
            if (lstatSync(curPath)
                .isDirectory()) { // recurse
                deleteFolderRecursive(curPath);
            } else { // delete file
                unlinkSync(curPath);
            }
        });
        rmdirSync(path);
    }
};

describe('i18n', () => {

    const translationsPath = join(process.cwd(), 'translations');

    after(() => {
        try {
            rmdirSync(translationsPath, { recursive: true });
        } catch (err) {
            console.log('found error while deleting folder, it is expected on Node 10 or lower', err);
            deleteFolderRecursive(translationsPath);
        }
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
