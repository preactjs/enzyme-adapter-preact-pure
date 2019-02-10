import { EnzymeRenderer, JSXElement, RSTNode } from 'enzyme';

import MountRenderer from './MountRenderer';
import { withShallowRendering } from './shallow-render-utils';

export default class ShallowRenderer implements EnzymeRenderer {
  private _mountRenderer: MountRenderer;

  constructor() {
    this._mountRenderer = new MountRenderer();
  }

  render(el: JSXElement, context: any, callback?: () => any) {
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

  simulateError(node: RSTNode, rootNode: RSTNode, error: any) {
    withShallowRendering(() => {
      this._mountRenderer.simulateError(node, rootNode, error);
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

  rootNode() {
    return this._mountRenderer.rootNode();
  }
}
