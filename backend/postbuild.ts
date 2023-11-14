import * as fs from 'fs';
import * as path from 'path';
import {execSync} from 'child_process';

const functionsDir = 'src';
fs.readdirSync(path.join(__dirname, functionsDir))
  .filter(entry => entry !== 'common')
  .map(entry => {
    const commands = [
      'ls -lah',
      `pushd dist/${entry}`,
      `echo "zipping ${entry} lambda"`,
      `zip -R ${entry}.zip *.js`,
      'popd',
    ];
    execSync(commands.join(' && '), {
      stdio: 'inherit',
    });
  });

