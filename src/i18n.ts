'use strict';

import { join } from 'path';
import { readdirSync, existsSync } from 'fs';
import i18next from 'i18next';
import Backend from 'i18next-fs-backend';

const translationsPath = join(process.cwd(), '/translations');

i18next
    .use(Backend)
    .init({
        // debug: true,
        initImmediate: false,
        fallbackLng: 'en',
        lng: 'en',
        keySeparator: false, // default is '.', but we use dots in keys in Storyous
        preload: existsSync(translationsPath)
            ? readdirSync(translationsPath)
                .filter((fileName: string) => /\.json$/.test(fileName)) // get rid of .gitignore
                .map((fileName: string) => fileName.replace(/\.json$/, ''))
            : [],
        backend: {
            loadPath: join(translationsPath, '/{{lng}}.json')
        }
    });

export default i18next;
