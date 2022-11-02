// Overrideable Preact imports for use in tests.
//
// This is used to enable testing with preact/compat.

import * as preact from 'preact';

export { VNode } from 'preact';

export const Component = preact.Component;
export const Fragment = preact.Fragment;
export const cloneElement = preact.cloneElement;
export const h = preact.h;
export const options = preact.options;
export const render = preact.render;

/**
 * Flag indicating whether 'preact/compat' or 'preact-compat' is being used.
 */
export const isCompat = false;
