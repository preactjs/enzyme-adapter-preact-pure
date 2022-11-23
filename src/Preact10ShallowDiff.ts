import type { ComponentChild, JSX } from 'preact';
import type {
  VNode as InternalVNode,
  Component as InternalComponentType,
  ComponentClass,
  FunctionComponent,
  Options,
} from 'preact/src/internal';
import { Component, options as rawOptions, isValidElement } from 'preact';
import { getComponent } from './preact10-internals.js';

/*
 * This module implements a custom diff algorithm for Preact components that
 * shallowly renders them. Much of the core implementation (`diffComponent` and
 * related helpers) is copied directly from the Preact 10 source code.
 *
 * Since this file includes code from Preact's source, we need to transform the
 * friendly names of internal properties to their mangled public names. We run a
 * custom Babel transform on this file to do that replacement.
 *
 * This custom diff algorithm is exposed on a class that mirrors Enzyme's
 * `ReactShallowRender`. This class, `Preact10ShallowDiff`, exposes the same API
 * as `ReactShallowRenderer` as passes nearly the exact same test suite.
 */

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

type ComponentVNode<P = any> =
  | ClassComponentVNode<P>
  | FunctionComponentVNode<P>;

type VNode<P = any> = ElementVNode<P> | ComponentVNode<P>;

interface ShallowDiffComponent<P = any> extends Component<P> {
  // Custom property for the Shallow renderer
  _preact10ShallowDiff: Preact10ShallowDiff;
}

let shallowOptionsInstalled = false;

/** Setup options necessary for shallow rendering */
function installOptionsForShallowDiff() {
  if (shallowOptionsInstalled) {
    return;
  }

  /**
   * Eagerly set _preact10ShallowDiff on the component instance so later code
   * (e.g. the diffed option later in this function) can inspect it to know that
   * this component is being shallow rendered and can respond accordingly
   */
  const prevRender = (options as any).__r;
  (options as any).__r = (vnode: VNode<any>) => {
    prevRender(vnode);

    const component = getComponent(vnode) as ShallowDiffComponent | null;
    if (component && Preact10ShallowDiff.current) {
      component._preact10ShallowDiff = Preact10ShallowDiff.current;
    }
  };

  /**
   * If this component is being shallow rendered, remove all hook effect
   * callbacks to match how enzyme shallow render's React
   */
  const prevDiffed = options.diffed;
  options.diffed = vnode => {
    const component = getComponent(vnode) as ShallowDiffComponent | null;
    if (component && component._preact10ShallowDiff) {
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
 * Here, the _preact10ShallowDiff property does something similar as React
 * Component's `updater` property. React Component's `updater` property contains
 * a reference to the implementations of `setState`, `forceUpdate`, etc. and it
 * is set by the code that rendered the component (e.g. ReactDOM). Here the
 * presence of the `_preact10ShallowDiff` property (set by the shallow renderer)
 * indicates `setState` and `forceUpdate` should call into our custom shallow
 * implementation.
 */
function installShallowComponentHooks() {
  const prevSetState = Component.prototype.setState;
  Component.prototype.setState = function (
    this: ShallowDiffComponent,
    update: any,
    callback: () => void
  ) {
    if (this._preact10ShallowDiff) {
      shallowSetState.call(this as any, update, callback);
    } else {
      prevSetState.call(this, update, callback);
    }
  };

  const prevForceUpdate = Component.prototype.forceUpdate;
  Component.prototype.forceUpdate = function (
    this: ShallowDiffComponent,
    callback: () => void
  ) {
    if (this._preact10ShallowDiff) {
      shallowForceUpdate.call(this as any, callback);
    } else {
      prevForceUpdate.call(this, callback);
    }
  };
}

installShallowComponentHooks();

/**
 * This class mirrors ReactShallowRenderer for the purpose of shallow rendering
 * Preact components. It implements the same API and passes almost the exact
 * same test suite
 *
 * https://github.com/enzymejs/react-shallow-renderer
 */
export default class Preact10ShallowDiff {
  static createRenderer = function () {
    return new Preact10ShallowDiff();
  };

  /** The current rendering instance of Preact10ShallowDiff */
  static current: Preact10ShallowDiff | null = null;

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
  private _componentInstance: ShallowDiffComponent | null = null;
  /**
   * The result of the last call to render.
   */
  private _rendered: ComponentChild = null;

  constructor() {
    installOptionsForShallowDiff();
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

    if (Preact10ShallowDiff.current) {
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

    Preact10ShallowDiff.current = this;

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
      ) as ShallowDiffComponent;
      this._componentInstance._preact10ShallowDiff = this;
    } finally {
      Preact10ShallowDiff.current = null;
    }

    return this._rendered;
  }

  public unmount() {
    Preact10ShallowDiff.current = this;

    if (this._prevElement) {
      unmount(this._prevElement);
    }

    if (this._memoElement) {
      unmount(this._memoElement);
    }

    Preact10ShallowDiff.current = null;
    this._reset();
  }

  private _reset() {
    this._prevElement = null;
    this._memoElement = null;
    this._componentInstance = null;
    this._rendered = null;

    Preact10ShallowDiff.current = null;
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
        // The memo component updated, so let's setup to update and diff the
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

    // If diffing this component told us not to update, then return the result
    // of the previous render. Else, return the result of the diff
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
      `Preact10ShallowDiff render(): Invalid component element. ${
        typeof element === 'function'
          ? 'Instead of passing a component class, make sure to instantiate it by passing it to Preact.createElement.'
          : ''
      }`
    );
  }

  // Show a special message for host elements since it's a common case.
  if (typeof element.type === 'string') {
    throw new Error(
      `Preact10ShallowDiff render(): Shallow rendering works only with custom components, not primitives (${element.type}). Instead of calling \`.render(el)\` and inspecting the rendered output, look at \`el.props\` directly instead.`
    );
  }

  if (typeof element.type !== 'function') {
    throw new Error(
      `Preact10ShallowDiff render(): Shallow rendering works only with custom components, but the provided element type was \`${
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

/** Symbol to return if a component indicates it should not update */
const skipUpdateSymbol = Symbol('Preact10ShallowDiff skip update');

/**
 * Shallowly diff a component. Much of this function is copied directly from the
 * Preact 10 source. Differences to the original source are commented.
 */
function diffComponent(
  newVNode: ComponentVNode,
  oldVNode: ComponentVNode,
  globalContext: any,
  commitQueue: Component[]
) {
  /* eslint-disable */
  let tmp,
    newType = newVNode.type,
    parentDom = null;

  if (options._diff) options._diff(newVNode);

  // ===== START PREACT SOURCE COPY =====

  let c, isNew, oldProps, clearProcessingException;
  let newProps = newVNode.props;

  // Necessary for createContext api. Setting this property will pass
  // the context value as `this.context` just for this component.
  tmp = newType.contextType;
  let provider = tmp && globalContext[tmp._id];
  let componentContext = tmp
    ? provider
      ? provider.props.value
      : tmp._defaultValue
    : globalContext;

  // Get component and set it to `c`
  if (oldVNode._component) {
    c = newVNode._component = oldVNode._component;
    clearProcessingException = c._processingException = c._pendingError;
  } else {
    // Instantiate the new component
    if ('prototype' in newType && newType.prototype.render) {
      // @ts-ignore The check above verifies that newType is suppose to be constructed
      newVNode._component = c = new newType(newProps, componentContext); // eslint-disable-line new-cap
    } else {
      // @ts-ignore Trust me, Component implements the interface we want
      newVNode._component = c = new Component(newProps, componentContext);
      c.constructor = newType;
      c.render = doRender;
    }
    if (provider) provider.sub(c);

    c.props = newProps;
    if (!c.state) c.state = {};
    c.context = componentContext;
    c._globalContext = globalContext;
    isNew = c._dirty = true;
    c._renderCallbacks = [];
    c._stateCallbacks = [];
  }

  // Invoke getDerivedStateFromProps
  if (c._nextState == null) {
    c._nextState = c.state;
  }

  if (newType.getDerivedStateFromProps != null) {
    if (c._nextState == c.state) {
      c._nextState = assign({}, c._nextState);
    }

    assign(
      c._nextState,
      newType.getDerivedStateFromProps(newProps, c._nextState)
    );
  }

  oldProps = c.props;
  // oldState = c.state;

  // Invoke pre-render lifecycle methods
  if (isNew) {
    if (
      newType.getDerivedStateFromProps == null &&
      c.componentWillMount != null
    ) {
      c.componentWillMount();
    }

    // == SHALLOW DIFF CHANGE: Don't invoke CDM
    // if (c.componentDidMount != null) {
    //   c._renderCallbacks.push(c.componentDidMount);
    // }
  } else {
    if (
      newType.getDerivedStateFromProps == null &&
      newProps !== oldProps &&
      c.componentWillReceiveProps != null
    ) {
      c.componentWillReceiveProps(newProps, componentContext);
    }

    if (
      (!c._force &&
        c.shouldComponentUpdate != null &&
        c.shouldComponentUpdate(newProps, c._nextState, componentContext) ===
          false) ||
      newVNode._original === oldVNode._original
    ) {
      c.props = newProps;
      c.state = c._nextState;
      // More info about this here: https://gist.github.com/JoviDeCroock/bec5f2ce93544d2e6070ef8e0036e4e8
      if (newVNode._original !== oldVNode._original) c._dirty = false;
      c._vnode = newVNode;
      newVNode._dom = oldVNode._dom;
      newVNode._children = oldVNode._children;
      newVNode._children?.forEach(vnode => {
        if (vnode) vnode._parent = newVNode;
      });

      for (let i = 0; i < c._stateCallbacks.length; i++) {
        c._renderCallbacks.push(c._stateCallbacks[i]);
      }
      c._stateCallbacks = [];

      if (c._renderCallbacks.length) {
        commitQueue.push(c);
      }

      // break outer;
      return skipUpdateSymbol; // === SHALLOW DIFF CHANGE: return skip update symbol
    }

    if (c.componentWillUpdate != null) {
      c.componentWillUpdate(newProps, c._nextState, componentContext);
    }

    // == SHALLOW DIFF CHANGE: Don't invoke CDU
    // if (c.componentDidUpdate != null) {
    //   c._renderCallbacks.push(() => {
    //     c.componentDidUpdate(oldProps, oldState, snapshot);
    //   });
    // }
  }

  c.context = componentContext;
  c.props = newProps;
  c._vnode = newVNode;
  c._parentDom = parentDom;

  let renderHook = options._render,
    count = 0;
  if ('prototype' in newType && newType.prototype.render) {
    c.state = c._nextState;
    c._dirty = false;

    if (renderHook) renderHook(newVNode);

    tmp = c.render(c.props, c.state, c.context);

    for (let i = 0; i < c._stateCallbacks.length; i++) {
      c._renderCallbacks.push(c._stateCallbacks[i]);
    }
    c._stateCallbacks = [];
  } else {
    do {
      c._dirty = false;
      if (renderHook) renderHook(newVNode);

      tmp = c.render(c.props, c.state, c.context);

      // Handle setState called in render, see #2553
      c.state = c._nextState;
    } while (c._dirty && ++count < 25);
  }

  // Handle setState called in render, see #2553
  c.state = c._nextState;

  if (c.getChildContext != null) {
    globalContext = assign(assign({}, globalContext), c.getChildContext());
  }

  // == SHALLOW DIFF CHANGE: Don't invoke gSBU
  // if (!isNew && c.getSnapshotBeforeUpdate != null) {
  //   snapshot = c.getSnapshotBeforeUpdate(oldProps, oldState);
  // }

  let renderResult = tmp;

  // == SHALLOW DIFF CHANGE: Don't skip Fragments returned from components
  // let isTopLevelFragment =
  //   tmp != null && tmp.type === Fragment && tmp.key == null;
  // let renderResult = isTopLevelFragment ? tmp.props.children : tmp;

  // == SHALLOW DIFF CHANGE: Don't render children
  // diffChildren(
  //   parentDom,
  //   Array.isArray(renderResult) ? renderResult : [renderResult],
  //   newVNode,
  //   oldVNode,
  //   globalContext,
  //   isSvg,
  //   excessDomChildren,
  //   commitQueue,
  //   oldDom,
  //   isHydrating
  // );

  c.base = newVNode._dom;

  // We successfully rendered this VNode, unset any stored hydration/bailout state:
  newVNode._hydrating = null;

  if (c._renderCallbacks.length) {
    commitQueue.push(c);
  }

  if (clearProcessingException) {
    c._pendingError = c._processingException = null;
  }

  c._force = false;

  // ===== END PREACT SOURCE COPY =====

  if (options.diffed) options.diffed(newVNode);

  return renderResult;
}

/**
 * Assign properties from `props` to `obj`
 * @template O, P The obj and props types
 * @param {O} obj The object to copy properties to
 * @param {P} props The object to copy properties from
 * @returns {O & P}
 */
function assign<O, P>(obj: O, props: P) {
  // ===== COPIED FROM PREACT SOURCE =====

  // @ts-ignore We change the type of `obj` to be `O & P`
  for (let i in props) obj[i] = props[i];
  return obj as O & P;
}

/** The `.render()` method for a PFC backing instance. */
function doRender(this: any, props: any, state: any, context: any) {
  return this.constructor(props, context);
}

/**
 * @param {Array<import('../internal').Component>} commitQueue List of components
 * which have callbacks to invoke in commitRoot
 * @param {import('../internal').VNode} root
 */
function commitRoot(commitQueue: any[], root: ComponentVNode) {
  // ===== COPIED FROM PREACT SOURCE =====

  if (options._commit) options._commit(root, commitQueue);

  commitQueue.some(c => {
    try {
      // @ts-ignore Reuse the commitQueue variable here so the type changes
      commitQueue = c._renderCallbacks;
      c._renderCallbacks = [];
      commitQueue.some(cb => {
        // @ts-ignore See above ts-ignore on commitQueue
        cb.call(c);
      });
    } catch (e) {
      options._catchError(e, c._vnode, undefined, {});
    }
  });
}

function unmount(vnode: InternalVNode) {
  // ===== COPIED FROM PREACT SOURCE =====

  let r;
  if (options.unmount) options.unmount(vnode);

  // == SHALLOW DIFF CHANGE: Don't invoke refs
  // if ((r = vnode.ref)) {
  // 	if (!r.current || r.current === vnode._dom) {
  // 		applyRef(r, null, parentVNode);
  // 	}
  // }

  if ((r = vnode._component) != null) {
    if (r.componentWillUnmount) {
      try {
        r.componentWillUnmount();
      } catch (e) {
        options._catchError(e, vnode._parent!, undefined, undefined);
      }
    }

    r.base = r._parentDom = undefined;
    vnode._component = null;
  }

  // == SHALLOW DIFF CHANGE: Don't unmount children
  // if ((r = vnode._children)) {
  // 	for (let i = 0; i < r.length; i++) {
  // 		if (r[i]) {
  // 			unmount(
  // 				r[i],
  // 				parentVNode,
  // 				skipRemove || typeof vnode.type !== 'function'
  // 			);
  // 		}
  // 	}
  // }

  // == SHALLOW DIFF CHANGE: Don't remove DOM nodes
  // if (!skipRemove && vnode._dom != null) {
  // 	removeNode(vnode._dom);
  // }

  // Must be set to `undefined` to properly clean up `_nextDom`
  // for which `null` is a valid value. See comment in `create-element.js`
  vnode._parent = vnode._dom = vnode._nextDom = undefined as any;
}

function shallowSetState(
  this: InternalComponentType,
  update: any,
  callback: () => void
) {
  // ===== COPIED FROM PREACT SOURCE ===== Need to have our own version so our
  // own `enqueueRender` function is called. The one built-in to Preact always
  // calls the real client renderer

  // only clone state when copying to nextState the first time.
  let s;
  if (this._nextState != null && this._nextState !== this.state) {
    s = this._nextState;
  } else {
    s = this._nextState = assign({}, this.state);
  }

  if (typeof update == 'function') {
    // Some libraries like `immer` mark the current state as readonly,
    // preventing us from mutating it, so we need to clone it. See #2716
    update = update(assign({}, s), this.props);
  }

  if (update) {
    assign(s, update);
  }

  // Skip update if updater function returned null
  if (update == null) return;

  if (this._vnode) {
    if (callback) {
      this._stateCallbacks.push(callback);
    }
    enqueueRender(this);
  }
}

function shallowForceUpdate(this: InternalComponentType, callback: () => void) {
  // ===== COPIED FROM PREACT SOURCE ===== Need to have our own version so our
  // own `enqueueRender` function is called. The one built-in to Preact always
  // calls the real client renderer

  this._force = true;
  if (callback) this._renderCallbacks.push(callback);
  enqueueRender(this);
}

function enqueueRender(component: InternalComponentType) {
  let newVNode: InternalVNode = assign({}, component._vnode);
  newVNode._original = NaN;

  component._dirty = true;

  let renderer = (component as unknown as ShallowDiffComponent)
    ._preact10ShallowDiff;
  renderer?.render(newVNode, component._globalContext);
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
