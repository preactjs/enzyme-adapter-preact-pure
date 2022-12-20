import { transformFileSync } from '@babel/core';
import { existsSync, readFileSync, writeFileSync, readdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * This module transforms Preact internal field names from their friendly names
 * to their mangled names (e.g. _component -> __c). The 'mangle.json' file next
 * to this file is copied directly from the Preact v10 source and used here to
 * do to the property renaming.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = (...args) => path.join(__dirname, '..', '..', ...args);

const preact10Dirs = [
  repoRoot('./build/compat/src/compat-shallow-renderer/'),
  repoRoot('./build-cjs/compat/src/compat-shallow-renderer/'),
];

function getPreact10Renames() {
  const rename = {};

  const manglePath = repoRoot('compat/scripts/mangle.json');
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

const preact10Renames = getPreact10Renames();

/** @type {(inputSourceMapPath: string | null) => import('@babel/core').TransformOptions} */
const preact10BabelConfig = inputSourceMapPath => {
  /** @type {import('@babel/core').TransformOptions["inputSourceMap"]} */
  let inputSourceMap = undefined;
  if (inputSourceMapPath) {
    inputSourceMap = JSON.parse(readFileSync(inputSourceMapPath, 'utf-8'));
  }

  return {
    babelrc: false,
    configFile: false,
    plugins: [
      ['babel-plugin-transform-rename-properties', { rename: preact10Renames }],
    ],
    inputSourceMap,
    sourceMaps: inputSourceMapPath ? true : false,
  };
};

function manglePreact10Properties(filePath) {
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

for (let fileDir of preact10Dirs) {
  if (!existsSync(fileDir)) {
    // Skip any files not built yet
    continue;
  }

  for (let filename of readdirSync(fileDir)) {
    if (filename.endsWith('.js') || filename.endsWith('.mjs')) {
      manglePreact10Properties(path.join(fileDir, filename));
    }
  }
}
