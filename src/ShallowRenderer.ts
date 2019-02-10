import { EnzymeRenderer, JSXElement, RSTNode } from 'enzyme';
import { h, options } from 'preact';

import { VNodeExtensions } from './preact-internals';
import MountRenderer from './MountRenderer';
import { makeShallowRenderComponent } from './shallow-render-utils';

/**
 * Map of component function to replacement stub function used when shallow
 * rendering.
 */
let shallowRenderComponents = new Map<Function, Function>();

/**
 * Global flag indicating whether shallow rendering is active.
 */
let shallowRenderActive = false;

let shallowRenderHookInstalled = false;

/**
 * Preact `options.vnode` hook that causes a component not to be rendered when
 * shallow rendering is enabled.
 */
function shallowRenderVNode(vnode: VNodeExtensions) {
  if (!shallowRenderActive || typeof vnode.nodeName === 'string') {
    return;
  }

  vnode.originalType = vnode.nodeName;

  let stub = shallowRenderComponents.get(vnode.nodeName);
  if (!stub) {
    stub = makeShallowRenderComponent(vnode.nodeName);
    shallowRenderComponents.set(vnode.nodeName, stub);
  }
  vnode.nodeName = stub as any;
}

function installShallowRenderHook() {
  if (shallowRenderHookInstalled) {
    return;
  }
  const prevHook = options.vnode;
  options.vnode = vnode => {
    shallowRenderVNode(vnode as VNodeExtensions);
    if (prevHook) {
      prevHook(vnode);
    }
  };
  shallowRenderHookInstalled = true;
}

/**
 * Execute `fn` with shallow rendering enabled.
 */
function withShallowRendering(fn: () => any) {
  try {
    shallowRenderActive = true;
    fn();
  } finally {
    shallowRenderActive = false;
  }
}

export default class ShallowRenderer implements EnzymeRenderer {
  private _mountRenderer: MountRenderer;

  constructor() {
    this._mountRenderer = new MountRenderer();
    installShallowRenderHook();
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
    });
  }

  simulateError(node: RSTNode, rootNode: RSTNode, error: any) {
    this._mountRenderer.simulateError(node, rootNode, error);
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
