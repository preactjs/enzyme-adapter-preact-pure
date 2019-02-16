import { EnzymeRenderer, JSXElement, RSTNode } from 'enzyme';
import { render as renderToString } from 'preact-render-to-string';
import { h, render } from 'preact';

import { isPreact10 } from './util';

export default class StringRenderer implements EnzymeRenderer {
  render(el: JSXElement, context: any) {
    if (isPreact10()) {
      // preact-render-to-string does not support Preact 10 yet.
      const tempContainer = document.createElement('div');
      render(el as any, tempContainer);
      const html = tempContainer.innerHTML;
      render(h('unmount-me', {}), tempContainer);
      return html;
    } else {
      return renderToString(el as any, context);
    }
  }

  simulateError(node: RSTNode, rootNode: RSTNode, error: any) {
    throw new Error('Static rendering does not support simulating errors');
  }

  simulateEvent(node: RSTNode, eventName: string, args: Object) {
    throw new Error('Static rendering does not support simulating events');
  }

  unmount() {
    // No-op
  }

  getNode() {
    return null;
  }

  batchedUpdates(fn: () => {}) {
    fn();
  }

  rootNode() {
    return null;
  }
}
