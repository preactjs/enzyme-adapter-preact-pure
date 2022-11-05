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
  withPatchedShallowRoot,
} from './shallow-render-utils.js';
import { childElements } from './compat.js';
import { propFromEvent } from './util.js';
import { getShallowNode } from './preact10-rst.js';
import {
  getChildren,
  getLastVNodeRenderedIntoContainer,
} from './preact10-internals.js';

export type Options = PreactAdapterOptions;

export default class ShallowRenderer implements AbstractShallowRenderer {
  private _mountRenderer: MountRenderer;
  private _options: Options;

  constructor(options: Options = {}) {
    this._mountRenderer = new MountRenderer({
      getNode: options.preserveFragmentsInShallowRender
        ? getShallowNode
        : undefined,
      ...options,
    });
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
      if (this._options.preserveFragmentsInShallowRender) {
        withPatchedShallowRoot(el, el => {
          this._mountRenderer.render(el, context);
        });
      } else {
        this._mountRenderer.render(el, context);
      }

      const rootNode = this._mountRenderer.getNode() as RSTNode;
      if (rootNode.type === 'host') {
        return;
      }

      // Monkey-patch `componentDidMount` to prevent it being called a second
      // time after `render` returns. React's shallow renderer does not
      // invoke lifecycle methods so Enzyme tries to invoke them manually. This
      // is not necessary for the Preact adapter because shallow rendering
      // works the same as normal rendering.
      rootNode.instance.componentDidMount = () => {};
    });
  }

  simulateError(nodeHierarchy: RSTNode[], rootNode: RSTNode, error: any) {
    withShallowRendering(() => {
      this._mountRenderer.simulateError(nodeHierarchy, rootNode, error);
    });
  }

  simulateEvent(node: RSTNode, eventName: string, ...args: any[]) {
    withShallowRendering(() => {
      if (this._options.simulateEventsOnComponents) {
        const handler = node.props[propFromEvent(eventName)];
        if (handler) {
          handler(...args);
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
    if (this._options.preserveFragmentsInShallowRender) {
      // If a tests schedules an update on a component and then calls
      // `wrapper.update()`, enzyme will end up invoking this method to get the
      // updated nodes. MountRenderer calls `flushRenders` to process those
      // updates in MountRenderer.getNode. Those rerenders need to happen with a
      // patched root VNode that properly preserves Fragments so we'll patch the
      // rootVNode here in case any rerenders are scheduled.

      const rootFragment = getLastVNodeRenderedIntoContainer(
        this._mountRenderer.container()
      );

      let rootVNode;
      if (rootFragment) {
        rootVNode = getChildren(rootFragment)[0];
      }

      return withPatchedShallowRoot(rootVNode, () =>
        this._mountRenderer.getNode()
      );
    } else {
      return this._mountRenderer.getNode();
    }
  }

  batchedUpdates(fn: () => any) {
    fn();
  }
}
