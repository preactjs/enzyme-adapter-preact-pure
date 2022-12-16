import type { ComponentChild, JSX } from 'preact';
import type {
  VNode as InternalVNode,
  ComponentClass,
  FunctionComponent,
  Options,
} from 'preact/src/internal';
import { Component, options as rawOptions, isValidElement } from 'preact';

import { getComponent } from '../../../src/preact10-internals.js';
import {
  diffComponent,
  commitRoot,
  unmount,
  shallowSetState,
  shallowForceUpdate,
  skipUpdateSymbol,
} from './preact10-shallow-diff.js';

const options = rawOptions as Options;

interface ElementVNode<P = any> extends InternalVNode<P> {
  type: string;
}

interface ClassComponentVNode<P = any> extends InternalVNode<P> {
  type: ComponentClass<P>;
}

interface FunctionComponentVNode<P = any> extends InternalVNode<P> {
  type: FunctionComponent<P>;
}

export type ComponentVNode<P = any> =
  | ClassComponentVNode<P>
  | FunctionComponentVNode<P>;

type VNode<P = any> = ElementVNode<P> | ComponentVNode<P>;

/**
 * Extend Preact's Component interface with a custom property to indicate this
 * component was shallow rendered. Used by our shallow setState and forceUpdate
 * implementations to rerender components shallowly.
 */
export interface ShallowRenderedComponent<P = any> extends Component<P> {
  _preactShallowRenderer: PreactShallowRenderer;
}

let shallowOptionsInstalled = false;

/** Setup options necessary for shallow rendering */
function installOptionsForShallowRender() {
  if (shallowOptionsInstalled) {
    return;
  }

  /**
   * Eagerly set _preactShallowRenderer on the component instance so later code
   * (e.g. the diffed option later in this function) can inspect it to know that
   * this component is being shallow rendered and can respond accordingly
   */
  const prevRender = (options as any).__r;
  (options as any).__r = (vnode: VNode<any>) => {
    prevRender(vnode);

    const component = getComponent(vnode) as ShallowRenderedComponent | null;
    if (component && PreactShallowRenderer.current) {
      component._preactShallowRenderer = PreactShallowRenderer.current;
    }
  };

  /**
   * If this component is being shallow rendered, remove all hook effect
   * callbacks to match how enzyme shallow render's React
   */
  const prevDiffed = options.diffed;
  options.diffed = vnode => {
    const component = getComponent(vnode) as ShallowRenderedComponent | null;
    if (component && component._preactShallowRenderer) {
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
 * Here, the _preactShallowRenderer property does something similar as React
 * Component's `updater` property. React Component's `updater` property contains
 * a reference to the implementations of `setState`, `forceUpdate`, etc. and it
 * is set by the code that rendered the component (e.g. ReactDOM). Here the
 * presence of the `_preactShallowRenderer` property (set by the shallow
 * renderer) indicates `setState` and `forceUpdate` should call into our custom
 * shallow implementation.
 */
function installShallowComponentHooks() {
  const prevSetState = Component.prototype.setState;
  Component.prototype.setState = function (
    this: ShallowRenderedComponent,
    update: any,
    callback: () => void
  ) {
    if (this._preactShallowRenderer) {
      shallowSetState.call(this as any, update, callback);
    } else {
      prevSetState.call(this, update, callback);
    }
  };

  const prevForceUpdate = Component.prototype.forceUpdate;
  Component.prototype.forceUpdate = function (
    this: ShallowRenderedComponent,
    callback: () => void
  ) {
    if (this._preactShallowRenderer) {
      shallowForceUpdate.call(this as any, callback);
    } else {
      prevForceUpdate.call(this, callback);
    }
  };
}

/**
 * This class mirrors ReactShallowRenderer for the purpose of shallow rendering
 * Preact components. It implements the same API and passes almost the exact
 * same test suite
 *
 * https://github.com/enzymejs/react-shallow-renderer
 */
export default class PreactShallowRenderer {
  static createRenderer = function () {
    return new PreactShallowRenderer();
  };

  /** The current rendering instance of PreactShallowRenderer */
  static current: PreactShallowRenderer | null = null;

  /**
   * The previous element that was shallowed rendered. It is used to diff an
   * element that gets updated through props or a setState call
   *
   * If render was given a memoed element, this holds the component that was
   * wrapped in memo. It is used if `setState` is called on the component and it
   * needs to be diffed directly.
   */
  private _prevElement: ComponentVNode | null = null;
  /**
   * If render was given a memoed component to render, this is the previous
   * memoed element that will be used if that memoed element is rerendered
   */
  private _memoElement: ComponentVNode | null = null;
  /**
   * The component instance that was shallow rendered. If render was given a
   * memoed element, then this is the instance of the component that was memoed
   */
  private _componentInstance: ShallowRenderedComponent | null = null;
  /**
   * The result of the last call to render.
   */
  private _rendered: ComponentChild = null;

  constructor() {
    installShallowComponentHooks();
    installOptionsForShallowRender();
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

    if (PreactShallowRenderer.current) {
      return;
    }

    // Determine if we need to diff against a previous render or if this is a
    // new render. If the given element type matches any of the previously
    // rendered elements, use it as the old VNode to diff against.
    let oldVNode: ComponentVNode;
    if (this._memoElement?.type === element.type) {
      oldVNode = this._memoElement;
    } else if (this._prevElement?.type === element.type) {
      oldVNode = this._prevElement;
    } else {
      // No matching element was found or this is the first render. Start with a
      // fresh state and reset the renderer.
      this._reset();
      oldVNode = {} as any;
    }

    PreactShallowRenderer.current = this;

    try {
      const commitQueue: any[] = [];
      this._rendered = this._diffComponent(
        element,
        oldVNode,
        context,
        commitQueue
      );
      commitRoot(commitQueue, element);

      this._componentInstance = getComponent(
        this._prevElement! // this._diffComponent sets _prevElement for us
      ) as ShallowRenderedComponent;
      this._componentInstance._preactShallowRenderer = this;
    } finally {
      PreactShallowRenderer.current = null;
    }

    return this._rendered;
  }

  public unmount() {
    PreactShallowRenderer.current = this;

    if (this._prevElement) {
      unmount(this._prevElement);
    }

    if (this._memoElement) {
      unmount(this._memoElement);
    }

    PreactShallowRenderer.current = null;
    this._reset();
  }

  private _reset() {
    this._prevElement = null;
    this._memoElement = null;
    this._componentInstance = null;
    this._rendered = null;

    PreactShallowRenderer.current = null;
  }

  private _diffComponent(
    newVNode: ComponentVNode<any>,
    oldVNode: ComponentVNode<any>,
    globalContext: any,
    commitQueue: any[]
  ) {
    // React's memo function wraps a component. It doesn't create a new VNode in
    // the virtual tree. To be compatible with React's shallow renderer, we'll
    // try to mimic this behavior so shallow enzyme tests don't need to be aware
    // of this subtle difference between Preact and React. Further, how Preact
    // implements Memo today may change in the future so we'll try to avoid
    // exposing that implementation detail to users.
    //
    // To mimic React's behavior here, we'll render through memo components. If
    // `render` is given an element representing a Memoed component, we will
    // render Memo and the component that it memos (assuming the Memo doesn't
    // instruct us to skip updating). The public methods on this class should
    // never return references to the Memo component, but always the component
    // that it is memoizing.

    let renderResult: ComponentChild | typeof skipUpdateSymbol;
    if (isMemo(newVNode)) {
      this._memoElement = newVNode;
      renderResult = diffComponent(
        newVNode,
        oldVNode,
        globalContext,
        commitQueue
      );

      if (renderResult == skipUpdateSymbol) {
        // The memo component told us not to update, so return the result of the
        // previous render
        return this._rendered;
      }

      if (isComponentVNode(renderResult)) {
        // The memo component updated, so let's setup to update and render the
        // component it returned
        newVNode = renderResult;
        oldVNode = this._prevElement ?? ({} as any);
      } else {
        throw new Error(
          `Memo rendered a non-component element. Only memo'ed components is currently supported for shallow rendering`
        );
      }
    }

    this._prevElement = newVNode;
    renderResult = diffComponent(
      newVNode,
      oldVNode,
      globalContext,
      commitQueue
    );

    // If rendering this component told us not to update, then return the result
    // of the previous render. Else, return the result of this render
    return renderResult === skipUpdateSymbol ? this._rendered : renderResult;
  }
}

function isComponentVNode<P = any>(element: any): element is ComponentVNode<P> {
  return isValidElement(element) && typeof element.type === 'function';
}

function assertIsComponentVNode(
  element: JSX.Element
): asserts element is ComponentVNode {
  if (!isValidElement(element)) {
    throw new Error(
      `PreactShallowRenderer render(): Invalid component element. ${
        typeof element === 'function'
          ? 'Instead of passing a component class, make sure to instantiate it by passing it to Preact.createElement.'
          : ''
      }`
    );
  }

  // Show a special message for host elements since it's a common case.
  if (typeof element.type === 'string') {
    throw new Error(
      `PreactShallowRenderer render(): Shallow rendering works only with custom components, not primitives (${element.type}). Instead of calling \`.render(el)\` and inspecting the rendered output, look at \`el.props\` directly instead.`
    );
  }

  if (typeof element.type !== 'function') {
    throw new Error(
      `PreactShallowRenderer render(): Shallow rendering works only with custom components, but the provided element type was \`${
        Array.isArray(element.type)
          ? 'array'
          : element.type === null
          ? 'null'
          : typeof element.type
      }\`.`
    );
  }
}

/** Determine if a VNode is a Memo wrapper */
function isMemo(node: VNode) {
  if (node?.type && typeof node.type === 'function') {
    const nodeType = node.type;
    return (
      (nodeType as any)._forwarded === true &&
      nodeType.displayName?.startsWith('Memo(')
    );
  }

  return false;
}

function removeEffectCallbacks(vnode: InternalVNode) {
  if (vnode._component) {
    const c = vnode._component;
    // Filter out useLayoutEffects and useInsertionEffect so they aren't invoked
    c._renderCallbacks = c._renderCallbacks.filter(cb =>
      (cb as any)._value ? false : true
    );

    // Clear out the list of useEffects so they aren't invoked
    const hooks = (c as any).__hooks;
    if (hooks) {
      hooks._pendingEffects = [];
    }
  }
}
