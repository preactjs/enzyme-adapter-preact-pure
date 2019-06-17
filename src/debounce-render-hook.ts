import { options } from 'preact';

import { isPreact10 } from './util';

let hookInstalled = false;
const pendingCallbacks = new Set();

/**
 * Default implementation of debounced rendering, taken from Preact's
 * `enqueueRender` implementation.
 */
function defer(callback: () => any) {
  Promise.resolve().then(callback);
}

/**
 * Install an `options.debounceRendering` hook that tracks any debounced
 * renders scheduled by Preact, eg. due to a `setState` call.
 *
 * Scheduled renders will automatically flush in the next microtask as normal,
 * but can be manually flushed using `flushRenders`.
 */
export function installHook() {
  if (hookInstalled) {
    return;
  }

  if (isPreact10()) {
    // Install a workaround for https://github.com/preactjs/preact/issues/1681.
    // This is only required for 10.0.0.beta.2 and earlier.
    const testUtils = require('preact/test-utils');
    const origAct = testUtils.act;
    testUtils.act = (callback: () => any) => {
      const prevHook = options.debounceRendering;
      origAct(callback);
      options.debounceRendering = prevHook;
    };
  }

  const origDebounce = options.debounceRendering || defer;
  function trackPendingRender(callback: () => any) {
    pendingCallbacks.add(callback);
    origDebounce.call(null, callback);
  }
  options.debounceRendering = trackPendingRender;
  hookInstalled = true;
}

/**
 * Synchronously perform any debounced renders that were scheduled by Preact
 * using `options.debounceRendering`.
 */
export function flushRenders() {
  pendingCallbacks.forEach(cb => {
    cb();
  });
  pendingCallbacks.clear();
}
