import { EnzymeRenderer, JSXElement, RSTNode } from 'enzyme';

import { render } from 'preact-render-to-string';

export default class StringRenderer implements EnzymeRenderer {
  render(el: JSXElement, context: any) {
    return render(el as any, context);
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
