import { options } from 'preact';

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
