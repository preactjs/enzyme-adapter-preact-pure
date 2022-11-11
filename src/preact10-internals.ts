import type { VNode } from 'preact';
import type {
  VNode as InternalVNode,
  Options,
  Component as InternalComponentType,
  ComponentClass,
  FunctionComponent,
  PreactElement,
} from 'preact/src/internal';
import { Component, options as rawOptions } from 'preact';

import type { PreactComponent as ShallowRenderComponent } from './PreactShallowRenderer';

const options = rawOptions as Options;

/**
 * This module provides access to internal properties of Preact 10 VNodes,
 * components and DOM nodes rendered by Preact, as well as internal diffing
 * algorithms
 *
 * The original property names (in the Preact source) are replaced with shorter
 * ones (they are "mangled") during the build. The mapping from original name to
 * short name is fixed, see `mangle.json` in the Preact source tree. We
 * automatically transform the friendly names to their mangled names in the
 * transform-internal-fields script
 */

interface ClassComponentVNode<P = any> extends InternalVNode<P> {
  type: ComponentClass<P>;
}

interface FunctionComponentVNode<P = any> extends InternalVNode<P> {
  type: FunctionComponent<P>;
}

export type ComponentVNode<P = any> =
  | ClassComponentVNode<P>
  | FunctionComponentVNode<P>;

/**
 * Return the last VNode that was rendered into a container using Preact's
 * `render` function.
 */
export function getLastVNodeRenderedIntoContainer(container: Node) {
  const preactContainer = container as PreactElement;
  return preactContainer._children ?? null;
}

/**
 * Return the VNode returned when `component` was last rendered.
 */
export function getLastRenderOutput(component: Component) {
  const preactComponent = component as InternalComponentType;
  return getChildren(preactComponent._vnode as VNode);
}

/**
 * Return the rendered DOM node associated with a rendered VNode.
 *
 * "Associated" here means either the DOM node directly output as a result of
 * rendering the vnode (for DOM vnodes) or the first DOM node output by a
 * child vnode for component vnodes.
 */
export function getDOMNode(node: VNode): Node | null {
  return (node as InternalVNode)._dom;
}

/**
 * Return the `Component` instance associated with a rendered VNode.
 */
export function getComponent(node: VNode): Component | null {
  return (node as InternalVNode)._component;
}

/**
 * Return the child VNodes associated with a rendered VNode.
 */
export function getChildren(node: VNode | null) {
  return (node as InternalVNode)._children!;
}

export function isMemo(node: VNode) {
  if (node?.type && typeof node.type === 'function') {
    const nodeType = node.type;
    return (
      (nodeType as any)._forwarded === true &&
      nodeType.displayName?.startsWith('Memo(')
    );
  }

  return false;
}

export function diffComponent(
  newVNode: ComponentVNode,
  oldVNode: ComponentVNode,
  globalContext: any,
  commitQueue: Component[],
  prevRenderResult: any
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

    // == SHALLOW RENDERER DIFF: Don't invoke CDM
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
      return prevRenderResult; // === SHALLOW RENDERER DIFF: return previous result
    }

    if (c.componentWillUpdate != null) {
      c.componentWillUpdate(newProps, c._nextState, componentContext);
    }

    // == SHALLOW RENDERER DIFF: Don't invoke CDU
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

  // == SHALLOW RENDERER DIFF: Don't invoke gSBU
  // if (!isNew && c.getSnapshotBeforeUpdate != null) {
  //   snapshot = c.getSnapshotBeforeUpdate(oldProps, oldState);
  // }

  let renderResult = tmp;

  // == SHALLOW RENDERER DIFF: Don't skip Fragments returned from components
  // let isTopLevelFragment =
  //   tmp != null && tmp.type === Fragment && tmp.key == null;
  // let renderResult = isTopLevelFragment ? tmp.props.children : tmp;

  // == SHALLOW RENDERER DIFF: Don't render children
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
export function commitRoot(commitQueue: any[], root: ComponentVNode) {
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

export function unmount(vnode: InternalVNode) {
  let r;
  if (options.unmount) options.unmount(vnode);

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

  // if (!skipRemove && vnode._dom != null) {
  // 	removeNode(vnode._dom);
  // }

  // Must be set to `undefined` to properly clean up `_nextDom`
  // for which `null` is a valid value. See comment in `create-element.js`
  vnode._parent = vnode._dom = vnode._nextDom = undefined as any;
}

export function removeEffectCallbacks(vnode: InternalVNode) {
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

// TODO: Only run modified code if in shallow rendering
Component.prototype.setState = function (
  this: InternalComponentType,
  update: any,
  callback: () => void
) {
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
};

// TODO: Only run modified code if running in shallow render
Component.prototype.forceUpdate = function (
  this: InternalComponentType,
  callback: () => void
) {
  this._force = true;
  if (callback) this._renderCallbacks.push(callback);
  enqueueRender(this);
};

function enqueueRender(component: InternalComponentType) {
  let newVNode: InternalVNode = assign({}, component._vnode);
  newVNode._original = NaN;

  component._dirty = true;

  let renderer = (component as unknown as ShallowRenderComponent)._renderer;
  renderer?.render(newVNode, component._globalContext);
}
