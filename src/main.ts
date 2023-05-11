import * as core from '@actions/core';
import fs from 'fs';

export default async function run(): Promise<void> {
  try {
    const secretsJson = core.getInput('secrets', {
      required: true,
    });
    const envPath = core.getInput('path', {
      required: true,
    });
    const includeRegexpStr = core.getInput('include_regexp');
    const excludeRegexpStr = core.getInput('exclude_regexp');
    const replaceRegexpStr = core.getInput('replace_regexp');

    let secrets: Record<string, string>;
    try {
      secrets = JSON.parse(secretsJson);
    } catch (e) {
      throw new Error(
        'Cannot parse JSON secrets. Be sure to set secrets: ${{ toJSON(secrets) }}',
      );
    }

    core.debug(`Current keys of secrets: ${Object.keys(secrets).join(', ')}`);

    const includeList = includeRegexpStr
      .split(',')
      .map(key => key.trim())
      .filter(key => key !== '');
    const excludeList = [
      'GITHUB_TOKEN',
      ...excludeRegexpStr
        .split(',')
        .map(key => key.trim())
        .filter(key => key !== ''),
    ];
    const replaceObject = replaceRegexpStr.split(',').map(key =>
      key
        .trim()
        .split('=')
        .map(val => val.trim()),
    );

    core.debug(`Using include list: ${includeList.join(', ')}`);
    if (includeList.length > 0) {
      secrets = Object.fromEntries(
        Object.entries(secrets).filter(([key]) =>
          includeList.some(pattern => key.match(new RegExp(pattern))),
        ),
      );
    }
    core.debug(`Current keys of secrets: ${Object.keys(secrets).join(', ')}`);

    core.debug(`Using exclude list: ${excludeList.join(', ')}`);
    secrets = Object.fromEntries(
      Object.entries(secrets).filter(
        ([key]) => !excludeList.some(pattern => key.match(new RegExp(pattern))),
      ),
    );
    core.debug(`Current keys of secrets: ${Object.keys(secrets).join(', ')}`);

    core.debug(
      `Using replace object: ${replaceObject
        .map(key => key.join('->'))
        .join(', ')}`,
    );
    if (replaceObject.length > 0) {
      for (const [search, replace] of replaceObject) {
        secrets = Object.fromEntries(
          Object.entries(secrets).map(([k, v]) => [
            k.replace(new RegExp(search), replace),
            v,
          ]),
        );
      }
    }

    const content = Object.entries(secrets)
      .map(([k, v]) => `${k}="${v}"\n`)
      .join('');
    fs.writeFileSync(envPath, content);
    core.info(
      `Generated file to ${envPath}. (keys: ${Object.keys(secrets).join(
        ', ',
      )})`,
    );
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message);
  }
}

if (require.main === module) {
  run();
}
