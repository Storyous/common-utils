'use strict';

const { join } = require('path');
const { readdirSync, existsSync } = require('fs');
const i18next = require('i18next');
const Backend = require('i18next-fs-backend');

const translationsPath = join(process.cwd(), '/translations');

i18next
    .use(Backend)
    .init({
        // debug: true,
        initImmediate: false,
        fallbackLng: 'en',
        lng: 'en',
        keySeparator: null, // default is '.', but we use dots in keys in Storyous
        preload: existsSync(translationsPath)
            ? readdirSync(translationsPath)
                .filter((fileName) => /\.json$/.test(fileName)) // get rid of .gitignore
                .map((fileName) => fileName.replace(/.json$/, ''))
            : [],
        backend: {
            loadPath: join(translationsPath, '/{{lng}}.json')
        }
    });

module.exports = i18next;
