import { transformFileSync } from '@babel/core';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * This module transforms Preact internal field names from their friendly names
 * to their mangled names (e.g. _component -> __c)
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = (...args) => path.join(__dirname, '..', ...args);

const preact10Files = [
  repoRoot('./build/src/Preact10ShallowDiff.js'),
  repoRoot('./build-cjs/src/Preact10ShallowDiff.js'),
];

const preact10Renames = {
  _listeners: 'l',
  _cleanup: '__c',
  __hooks: '__H',
  _list: '__',
  _pendingEffects: '__h',
  _value: '__',
  _pendingValue: '__V',
  _nextValue: '__N',
  _original: '__v',
  _args: '__H',
  _factory: '__h',
  _depth: '__b',
  _nextDom: '__d',
  _dirty: '__d',
  _mask: '__m',
  _detachOnNextRender: '__b',
  _force: '__e',
  _nextState: '__s',
  _renderCallbacks: '__h',
  _stateCallbacks: '_sb',
  _vnode: '__v',
  _children: '__k',
  _pendingSuspensionCount: '__u',
  _childDidSuspend: '__c',
  _onResolve: '__R',
  _suspended: '__a',
  _dom: '__e',
  _hydrating: '__h',
  _component: '__c',
  __html: '__html',
  _parent: '__',
  _pendingError: '__E',
  _processingException: '__',
  _globalContext: '__n',
  _context: 'c',
  _defaultValue: '__',
  _id: '__c',
  _contextRef: '__',
  _parentDom: '__P',
  _originalParentDom: '__O',
  _prevState: '__u',
  _root: '__',
  _diff: '__b',
  _commit: '__c',
  _addHookName: '__a',
  _render: '__r',
  _hook: '__h',
  _catchError: '__e',
  _unmount: '__u',
  _owner: '__o',
  _skipEffects: '__s',
  _rerenderCount: '__r',
  _forwarded: '__f',
  _isSuspended: '__i',
};

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
