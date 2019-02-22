import { EnzymeRenderer, RSTNode } from 'enzyme';
import { VNode } from 'preact';

import MountRenderer from './MountRenderer';
import {
  withShallowRendering,
  shallowRenderVNodeTree,
} from './shallow-render-utils';
import { childElements } from './compat';

export default class ShallowRenderer implements EnzymeRenderer {
  private _mountRenderer: MountRenderer;

  constructor() {
    this._mountRenderer = new MountRenderer();
  }

  render(el: VNode, context?: any, callback?: () => any) {
    // Make all elements in the input tree, except for the root element, render
    // to a stub.
    childElements(el).forEach(el => {
      if (el != null && typeof el !== 'string') {
        shallowRenderVNodeTree(el);
      }
    });

    // Make any new elements rendered by the root element render to a stub.
    withShallowRendering(() => {
      this._mountRenderer.render(el, context, callback);

      const rootNode = this._mountRenderer.getNode() as RSTNode;
      if (rootNode.type === 'host') {
        return;
      }

      // Monkey-patch the component's `setState` to make it shallow-render and
      // force an update after rendering.
      const instance = rootNode.instance;
      const originalSetState = instance.setState;
      instance.setState = function(...args: any[]) {
        withShallowRendering(() => {
          originalSetState.call(this, ...args);
        });
        this.forceUpdate();
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

  simulateEvent(node: RSTNode, eventName: string, args: Object) {
    withShallowRendering(() => {
      this._mountRenderer.simulateEvent(node, eventName, args);
    });
  }

  unmount() {
    this._mountRenderer.unmount();
  }

  getNode() {
    return this._mountRenderer.getNode();
  }

  batchedUpdates(fn: () => {}) {
    fn();
  }
}
