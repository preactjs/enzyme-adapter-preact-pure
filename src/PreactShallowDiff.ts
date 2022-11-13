import type { VNode, ComponentChild, JSX } from 'preact';
import { Component, options, isValidElement } from 'preact';

import type { ComponentVNode } from './preact10-internals';
import {
  commitRoot,
  diffComponent,
  getComponent,
  isMemo,
  unmount,
  removeEffectCallbacks,
  shallowSetState,
  shallowForceUpdate,
} from './preact10-internals.js';

export interface PreactComponent<P = any> extends Component<P> {
  // Custom property for the Shallow renderer
  _shallowRenderer: PreactShallowDiff;
}

let shallowOptionsInstalled = false;

/** Setup options necessary for shallow rendering */
function installOptionsForShallowRendering() {
  if (shallowOptionsInstalled) {
    return;
  }

  const prevRender = (options as any).__r;
  (options as any).__r = (vnode: VNode<any>) => {
    prevRender(vnode);

    // Eagerly set _shallowRenderer on the component instance so later code
    // (e.g. the diffed option later in this function) can inspect it to know
    // that this component is being shallow rendered and can respond accordingly
    const component = getComponent(vnode) as PreactComponent | null;
    if (component && PreactShallowDiff.current) {
      component._shallowRenderer = PreactShallowDiff.current;
    }
  };

  // If this component is being shallow rendered, remove all hook effect callbacks
  const prevDiffed = options.diffed;
  options.diffed = vnode => {
    const component = getComponent(vnode) as PreactComponent | null;
    if (component && component._shallowRenderer) {
      removeEffectCallbacks(vnode as any);
    }

    prevDiffed?.(vnode);
  };

  shallowOptionsInstalled = true;
}

/**
 * Replace existing setState and forceUpdate implementations with new
 * implementations that detect if a component has been shallow rendered and
 * ensures renders caused by setState/forceUpdate are also shallow rendered.
 *
 * Here, the _shallowRenderer property serves a similar purpose the `updater`
 * property on React Component's serve
 */
function installShallowComponentHooks() {
  const prevSetState = Component.prototype.setState;
  Component.prototype.setState = function (
    this: PreactComponent,
    update: any,
    callback: () => void
  ) {
    if (this._shallowRenderer) {
      shallowSetState.call(this as any, update, callback);
    } else {
      prevSetState.call(this, update, callback);
    }
  };

  const prevForceUpdate = Component.prototype.forceUpdate;
  Component.prototype.forceUpdate = function (
    this: PreactComponent,
    callback: () => void
  ) {
    if (this._shallowRenderer) {
      shallowForceUpdate.call(this as any, callback);
    } else {
      prevForceUpdate.call(this, callback);
    }
  };
}

installShallowComponentHooks();

/**
 * This class mirrors ReactShallowRenderer
 * (https://github.com/enzymejs/react-shallow-renderer) for the purpose of
 * shallow rendering Preact components. It implements the same API and passes
 * almost the exact same test suite
 */
export default class PreactShallowDiff {
  static createRenderer = function () {
    return new PreactShallowDiff();
  };

  static current: PreactShallowDiff | null = null;

  private _oldVNode: ComponentVNode | null = null;
  private _componentInstance: PreactComponent | null = null;
  private _rendered: ComponentChild = null;
  private _commitQueue: any[] = [];
  private _memoResultStack: any[] = [];

  constructor() {
    installOptionsForShallowRendering();
    this._reset();
  }

  public getMountedInstance(): Component<any, any> | null {
    return this._componentInstance;
  }

  public getRenderOutput(): ComponentChild {
    return this._rendered;
  }

  public render(element: JSX.Element, context: any = {}): ComponentChild {
    assertIsComponentVNode(element);

    if (PreactShallowDiff.current) {
      return;
    }
    if (this._oldVNode != null && this._oldVNode.type !== element.type) {
      this._reset();
    }

    PreactShallowDiff.current = this;

    try {
      this._commitQueue = [];
      const renderResult = this._diffComponent(
        element,
        this._oldVNode ?? ({} as ComponentVNode),
        context,
        this._commitQueue,
        this._rendered
      );
      this._commitRoot(element);

      this._componentInstance = getComponent(element) as PreactComponent;
      this._componentInstance._shallowRenderer = this;
      this._rendered = renderResult;
      this._oldVNode = element;
    } finally {
      PreactShallowDiff.current = null;
    }

    return this.getRenderOutput();
  }

  public unmount() {
    PreactShallowDiff.current = this;

    if (this._oldVNode) {
      unmount(this._oldVNode);
    }

    PreactShallowDiff.current = null;
    this._reset();
  }

  private _reset() {
    this._oldVNode = null;
    this._componentInstance = null;
    this._rendered = null;

    this._commitQueue = [];
    this._memoResultStack = [];

    PreactShallowDiff.current = null;
  }

  /** Diff a VNode and recurse through any Memo components */
  private _diffComponent(
    newVNode: ComponentVNode<any>,
    oldVNode: ComponentVNode<any>,
    globalContext: any,
    commitQueue: any[],
    prevRenderResult: any
  ) {
    let renderResult = diffComponent(
      newVNode,
      oldVNode,
      globalContext,
      commitQueue,
      prevRenderResult
    );

    while (isMemo(newVNode)) {
      const prevMemoResult = this._memoResultStack.pop();
      if (prevMemoResult === renderResult) {
        return this._oldVNode;
      } else {
        newVNode = renderResult;
        oldVNode = prevMemoResult ?? {};
        prevRenderResult = this._memoResultStack.length
          ? this._memoResultStack[this._memoResultStack.length - 1]
          : null;

        renderResult = diffComponent(
          newVNode,
          oldVNode,
          globalContext,
          commitQueue,
          prevRenderResult
        );

        this._memoResultStack.push(renderResult);
      }
    }

    return renderResult;
  }

  private _commitRoot(newVNode: ComponentVNode<any>) {
    commitRoot(this._commitQueue, newVNode);
    this._commitQueue = []; // Clear queue after committing
  }
}

function assertIsComponentVNode(
  element: JSX.Element
): asserts element is ComponentVNode {
  if (!isValidElement(element)) {
    throw new Error(
      `PreactShallowDiff render(): Invalid component element. ${
        typeof element === 'function'
          ? 'Instead of passing a component class, make sure to instantiate it by passing it to Preact.createElement.'
          : ''
      }`
    );
  }

  // Show a special message for host elements since it's a common case.
  if (!(typeof element.type !== 'string')) {
    throw new Error(
      `PreactShallowDiff render(): Shallow rendering works only with custom components, not primitives (${element.type}). Instead of calling \`.render(el)\` and inspecting the rendered output, look at \`el.props\` directly instead.`
    );
  }

  if (typeof element.type !== 'function') {
    throw new Error(
      `PreactShallowDiff render(): Shallow rendering works only with custom components, but the provided element type was \`${
        Array.isArray(element.type)
          ? 'array'
          : element.type === null
          ? 'null'
          : typeof element.type
      }\`.`
    );
  }
}
