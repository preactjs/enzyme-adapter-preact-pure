// This `<reference ...>` directive is necessary to include the adapter's
// extensions to types in the "preact" and "enzyme" packages.

// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference types="enzyme-adapter-preact-pure"/>

// @ts-ignore - JSDOM types are missing
import { JSDOM } from 'jsdom';

import { configure } from 'enzyme';
import Adapter from 'enzyme-adapter-preact-pure';

// Setup JSDOM
const dom = new JSDOM('', {
  // Enable `requestAnimationFrame` which Preact uses internally.
  pretendToBeVisual: true,
});

// @ts-ignore
globalThis.Event = dom.window.Event;
// @ts-ignore
globalThis.Node = dom.window.Node;
// @ts-ignore
globalThis.window = dom.window;
// @ts-ignore
globalThis.document = dom.window.document;
// @ts-ignore
globalThis.requestAnimationFrame = dom.window.requestAnimationFrame;

// Setup Enzyme
configure({ adapter: new Adapter() });
