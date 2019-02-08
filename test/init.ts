import { JSDOM } from 'jsdom';

function setupJSDOM() {
  const dom = new JSDOM();
  const g = global as any;
  g.Event = dom.window.Event;
  g.Node = dom.window.Node;
  g.window = dom.window;
  g.document = dom.window.document;
}

setupJSDOM();
