import { JSDOM } from 'jsdom';
import minimist from 'minimist';

// Setup DOM globals required by Preact rendering.
function setupJSDOM() {
  // Enable `requestAnimationFrame` which Preact 10 uses for scheduling hooks.
  const dom = new JSDOM('', { pretendToBeVisual: true });
  const g = global as any;
  g.Event = dom.window.Event;
  g.Node = dom.window.Node;
  g.window = dom.window;
  g.document = dom.window.document;
  g.requestAnimationFrame = dom.window.requestAnimationFrame;
}
setupJSDOM();

// Support specifying a custom Preact library on the command line using
// `--preact-lib <path to compiled Preact bundle>`.
//
// nb. This must be invoked _before_ any modules are loaded which require Preact.
const opts = minimist(process.argv.slice(2));
if (opts['preact-lib']) {
  const Module = require('module');
  const origRequire = Module.prototype.require;
  Module.prototype.require = function(path: string) {
    if (path === 'preact' || path.startsWith('preact/')) {
      path = path.replace(/^preact\b/, opts['preact-lib']);
    }
    return origRequire.apply(this, [path]);
  };
}

if (opts['preact-compat-lib']) {
  // Simulate a project which uses preact/compat as an alias for React.
  const path = opts['preact-compat-lib'];
  console.log(`Using React compat lib ${path}`);

  const compatLib = require(path);

  const preactTestImports = require('./preact');
  preactTestImports.isCompat = true;
  preactTestImports.h = compatLib.createElement;
  preactTestImports.Component = compatLib.Component;
}

// Log details of which Preact library is being used.
import { isPreact10 } from '../src/util';
console.log(`Using Preact ${isPreact10() ? '10+' : '<= 9'}`);

// For Preact <= 8, modify VNode class for compatibility with Preact 10.
import { addTypeAndPropsToVNode } from '../src/compat';
addTypeAndPropsToVNode();
