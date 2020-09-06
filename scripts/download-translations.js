#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { program } = require('commander');
const fetch = require('../lib/fetch');

program.requiredOption('--token <token>', 'lingohub token');
program.requiredOption('--project <project>', 'lingohub project');
program.option('--resource <project>', 'lingohub resource');
program.option('--dir <path>', 'target dir', path.join(process.cwd(), 'translations'));
program.parse(process.argv);
const {
    token, dir: targetDir, project, resource: resourceName
} = program;


const projectResourcesUrl = `https://api.lingohub.com/v1/storyous/projects/${project}/resources`;

fs.mkdirSync(targetDir, { recursive: true });
fs.writeFileSync(`${targetDir}/.gitignore`, `
# Ignore everything in this directory
*
# Except this file
!.gitignore
`);

(async () => {

    const { members } = await fetch.json(`${projectResourcesUrl}?auth_token=${token}`);

    for (const resource of members) {
        const jsonLink = resource.links.find((link) => link.type === 'text/json');
        if (!jsonLink || (resourceName && !resource.name.includes(resourceName))) {
            continue;
        }

        // eslint-disable-next-line no-await-in-loop
        const translations = await fetch.json(`${jsonLink.href}?auth_token=${token}`);

        fs.writeFileSync(path.join(targetDir, `${resource.project_locale}.json`), JSON.stringify(translations));

        // eslint-disable-next-line no-console
        console.log(`downloaded ${jsonLink.href}`);
    }

})();
