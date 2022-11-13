// @ts-expect-error - JSDOM types are missing
import { JSDOM } from 'jsdom';

type JSDOM = any;

const jsdomGlobals: Record<string, (dom: JSDOM) => any> = {
  Event: (jsdom: JSDOM) => jsdom.window.Event,
  Node: (jsdom: JSDOM) => jsdom.window.Node,
  window: (jsdom: JSDOM) => jsdom.window,
  document: (jsdom: JSDOM) => jsdom.window.document,
  requestAnimationFrame: (jsdom: JSDOM) => jsdom.window.requestAnimationFrame,
};

/** Setup DOM globals required by Preact rendering. */
export function setupJSDOM() {
  // Enable `requestAnimationFrame` which Preact uses for scheduling hooks.
  const dom = new JSDOM('', { pretendToBeVisual: true });
  const g = global as any;
  for (const prop of Object.keys(jsdomGlobals)) {
    g[prop] = jsdomGlobals[prop](dom);
  }
}

export function teardownJSDOM() {
  const g = global as any;
  for (const prop in Object.keys(jsdomGlobals)) {
    delete g[prop];
  }
}
