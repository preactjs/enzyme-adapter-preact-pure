// Overrideable Preact imports for use in tests.
//
// This is used to enable testing with preact/compat.

import * as preact from 'preact';

export { VNode } from 'preact';

export let Component = preact.Component;
export let Fragment = preact.Fragment;
export let cloneElement = preact.cloneElement;
export let h = preact.h;
export let options = preact.options;
export let render = preact.render;

/**
 * Flag indicating whether 'preact/compat' or 'preact-compat' is being used.
 */
export let isCompat = false;
