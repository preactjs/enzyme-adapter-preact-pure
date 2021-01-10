import { Renderer, RSTNode } from 'enzyme';
import { ReactElement } from 'react';
import { h, render } from 'preact';

export default class StringRenderer implements Renderer {
  render(el: ReactElement, context?: any) {
    const tempContainer = document.createElement('div');
    render(el as any, tempContainer);
    const html = tempContainer.innerHTML;
    render(h('unmount-me', {}), tempContainer);
    return html;
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
