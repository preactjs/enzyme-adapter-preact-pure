import type { Renderer, RSTNode } from 'enzyme';
import type { ReactElement } from 'react';
import { h, render } from 'preact';

import type { EventDetails } from './MountRenderer';
import type { PreactAdapterOptions } from './Adapter';

export default class StringRenderer implements Renderer {
  private _options: PreactAdapterOptions;

  constructor(options: PreactAdapterOptions) {
    this._options = options;
  }

  render(el: ReactElement, context?: any) {
    if (this._options.renderToString) {
      return this._options.renderToString(el, context);
    } else {
      const tempContainer = document.createElement('div');
      render(el as any, tempContainer);
      const html = tempContainer.innerHTML;
      render(h('unmount-me', {}), tempContainer);
      return html;
    }
  }

  simulateError(nodeHierarchy: RSTNode[], rootNode: RSTNode, error: any) {
    throw new Error('Static rendering does not support simulating errors');
  }

  simulateEvent(node: RSTNode, eventName: string, args: EventDetails) {
    throw new Error('Static rendering does not support simulating events');
  }

  unmount() {
    // No-op
  }

  getNode() {
    return null;
  }

  batchedUpdates(fn: () => any) {
    fn();
  }
}
