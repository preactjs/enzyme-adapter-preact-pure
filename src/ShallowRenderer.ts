import type {
  ShallowRenderer as AbstractShallowRenderer,
  RSTNode,
  ShallowRenderOptions,
} from 'enzyme';
import type { VNode } from 'preact';

import type { PreactAdapterOptions } from './Adapter.js';
import type { EventDetails } from './MountRenderer.js';
import MountRenderer from './MountRenderer.js';
import {
  withShallowRendering,
  shallowRenderVNodeTree,
} from './shallow-render-utils.js';
import { childElements } from './compat.js';
import { propFromEvent } from './util.js';

export type Options = PreactAdapterOptions;

export default class ShallowRenderer implements AbstractShallowRenderer {
  private _mountRenderer: MountRenderer;
  private _options: Options;

  constructor(options: Options = {}) {
    this._mountRenderer = new MountRenderer(options);
    this._options = options;
  }

  render(el: VNode, context?: any, options?: ShallowRenderOptions) {
    // Make all elements in the input tree, except for the root element, render
    // to a stub.
    childElements(el).forEach(el => {
      if (el != null && typeof el !== 'string') {
        shallowRenderVNodeTree(el);
      }
    });

    // Make any new elements rendered by the root element render to a stub.
    withShallowRendering(() => {
      this._mountRenderer.render(el, context);

      const rootNode = this._mountRenderer.getNode() as RSTNode;
      if (rootNode.type === 'host') {
        return;
      }

      // Monkey-patch the component's `render` to make it shallow-render.
      const instance = rootNode.instance;
      const originalRender = instance.render;
      instance.render = function (...args: any[]) {
        let result;
        withShallowRendering(() => {
          result = originalRender.call(this, ...args);
        });
        return result;
      };

      // Monkey-patch `componentDidMount` to prevent it being called a second
      // time after `render` returns. React's shallow renderer does not
      // invoke lifecycle methods so Enzyme tries to invoke them manually. This
      // is not necessary for the Preact adapter because shallow rendering
      // works the same as normal rendering.
      instance.componentDidMount = () => {};
    });
  }

  simulateError(nodeHierarchy: RSTNode[], rootNode: RSTNode, error: any) {
    withShallowRendering(() => {
      this._mountRenderer.simulateError(nodeHierarchy, rootNode, error);
    });
  }

  simulateEvent(node: RSTNode, eventName: string, args: EventDetails) {
    withShallowRendering(() => {
      if (this._options.simulateEventsOnComponents) {
        const handler = node.props[propFromEvent(eventName)];
        if (handler) {
          handler(args);
        }
      } else {
        this._mountRenderer.simulateEvent(node, eventName, args);
      }
    });
  }

  unmount() {
    this._mountRenderer.unmount();
  }

  getNode() {
    return this._mountRenderer.getNode();
  }

  batchedUpdates(fn: () => any) {
    fn();
  }
}
