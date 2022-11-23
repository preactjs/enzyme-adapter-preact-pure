import { transformFileSync } from '@babel/core';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * This module transforms Preact internal field names from their friendly names
 * to their mangled names (e.g. _component -> __c). The 'mangle.json' file next
 * to this file is copied directly from the Preact v10 source and used here to
 * do to the property renaming.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = (...args) => path.join(__dirname, '..', ...args);

const preact10Files = [
  repoRoot('./build/src/compat-shallow-renderer/Preact10ShallowDiff.js'),
  repoRoot('./build-cjs/src/compat-shallow-renderer/Preact10ShallowDiff.js'),
];

function getPreact10Renames() {
  const rename = {};

  const manglePath = repoRoot('scripts/mangle.json');
  const mangle = JSON.parse(readFileSync(manglePath, 'utf8'));

  for (let prop in mangle.props.props) {
    let name = prop;
    if (name[0] === '$') {
      name = name.slice(1);
    }

    rename[name] = mangle.props.props[prop];
  }

  return rename;
}

/** @type {(inputSourceMapPath: string | null) => import('@babel/core').TransformOptions} */
const preact10BabelConfig = inputSourceMapPath => {
  /** @type {import('@babel/core').TransformOptions["inputSourceMap"]} */
  let inputSourceMap = undefined;
  if (inputSourceMapPath) {
    inputSourceMap = JSON.parse(readFileSync(inputSourceMapPath, 'utf-8'));
  }

  const rename = getPreact10Renames();

  return {
    babelrc: false,
    configFile: false,
    plugins: [['babel-plugin-transform-rename-properties', { rename }]],
    inputSourceMap,
    sourceMaps: inputSourceMapPath ? true : false,
  };
};

for (let filePath of preact10Files) {
  if (!existsSync(filePath)) {
    // Skip any files not built yet
    continue;
  }

  // Determine if we should render source maps
  /** @type {string | null} */
  let inputSourceMapPath = filePath + '.map';
  if (!existsSync(inputSourceMapPath)) {
    inputSourceMapPath = null;
  }

  const config = preact10BabelConfig(inputSourceMapPath);
  const output = transformFileSync(filePath, config);
  if (output?.code == null) {
    throw new Error(
      `Babel output for ${filePath} was null: ${JSON.stringify(output)}`
    );
  }

  writeFileSync(filePath, output?.code, 'utf8');

  if (output?.map && inputSourceMapPath) {
    writeFileSync(inputSourceMapPath, JSON.stringify(output.map), 'utf8');
  }
}
