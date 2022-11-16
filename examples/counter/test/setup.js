/* global globalThis */
import { JSDOM } from 'jsdom';
import { configure } from 'enzyme';
import Adapter from 'enzyme-adapter-preact-pure';

// Setup JSDOM
const dom = new JSDOM('', {
  // Enable `requestAnimationFrame` which Preact uses internally.
  pretendToBeVisual: true,
});

globalThis.Event = dom.window.Event;
globalThis.Node = dom.window.Node;
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.requestAnimationFrame = dom.window.requestAnimationFrame;

// Setup Enzyme
configure({ adapter: new Adapter() });
