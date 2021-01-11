#!/usr/bin/env node

const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const baseDir = path.resolve(__dirname);
const packageDir = `${baseDir}/..`;
const yalcBin = `${packageDir}/node_modules/.bin/yalc`;

const exec = (cwd, cmd) => {
  console.log(`Running ${cmd} in ${cwd}`);
  execSync(cmd, { cwd, encoding: 'utf8' });
};

// Build and "publish" the package locally.
exec(packageDir, `${yalcBin} publish`);

// Run all the example projects.
for (let file of fs.readdirSync(baseDir, { withFileTypes: true })) {
  if (file.isDirectory()) {
    const exampleDir = `${baseDir}/${file.name}`;
    console.log(`Running example "${exampleDir}"`);

    exec(exampleDir, 'rm -rf node_modules');
    exec(exampleDir, 'npm ci');

    // Install the local version of the adapter using yalc, which ensures that
    // it behaves the same way as the package installed from npm.
    exec(exampleDir, `${yalcBin} link enzyme-adapter-preact-pure`);

    exec(exampleDir, 'npm test');
  }
}
