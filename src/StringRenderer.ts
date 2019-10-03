import { Renderer, JSXElement, RSTNode } from 'enzyme';
import { render as renderToString } from 'preact-render-to-string';
import { h, render } from 'preact';

import { isPreact10 } from './util';

export default class StringRenderer implements Renderer {
  render(el: JSXElement, context?: any) {
    // FIXME - The behavior here is different across different Preact versions.
    // Historically this was because preact-render-to-string v4.x did not support
    // Preact 10. In future we should unify them. This will be a breaking change
    // as it will affect the output for either Preact v8 or Preact v10.
    if (isPreact10()) {
      const tempContainer = document.createElement('div');
      render(el as any, tempContainer);
      const html = tempContainer.innerHTML;
      render(h('unmount-me', {}), tempContainer);
      return html;
    } else {
      return renderToString(el as any, context);
    }
  }

  simulateError(nodeHierarchy: RSTNode[], rootNode: RSTNode, error: any) {
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
}
