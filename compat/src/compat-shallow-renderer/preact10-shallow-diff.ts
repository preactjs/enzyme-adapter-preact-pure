/**
 * This file includes modified copies of the Preact source and custom
 * implementations of Preact functions (e.g. setState) to perform a shallow
 * render
 *
 * The Preact source is copyrighted to Jason Miller and licensed under the MIT
 * License, found a the link below:
 *
 * https://github.com/preactjs/preact/blob/d4089df1263faab9b980a3493a4c7e986f254f8e/LICENSE
 */

import { Component, options as rawOptions } from 'preact';
import type {
  VNode as InternalVNode,
  Component as InternalComponentType,
  Options,
} from 'preact/src/internal';

import type {
  ComponentVNode,
  ShallowRenderedComponent,
} from './PreactShallowRenderer';

const options = rawOptions as Options;

/** Symbol to return if a component indicates it should not update */
export const skipUpdateSymbol = Symbol('PreactShallowRenderer skip update');

/**
 * Shallowly render a component. Much of this function is copied directly from
 * the Preact 10 source. Differences to the original source are commented.
 */
export function diffComponent(
  newVNode: ComponentVNode,
  oldVNode: ComponentVNode,
  globalContext: any,
  commitQueue: InternalComponentType[]
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

    // == SHALLOW RENDER CHANGE: Don't invoke CDM
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
      return skipUpdateSymbol; // === SHALLOW RENDER CHANGE: return skip update symbol
    }

    if (c.componentWillUpdate != null) {
      c.componentWillUpdate(newProps, c._nextState, componentContext);
    }

    // == SHALLOW RENDER CHANGE: Don't invoke CDU
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

  // == SHALLOW RENDER CHANGE: Don't invoke gSBU
  // if (!isNew && c.getSnapshotBeforeUpdate != null) {
  //   snapshot = c.getSnapshotBeforeUpdate(oldProps, oldState);
  // }

  let renderResult = tmp;

  // == SHALLOW RENDER CHANGE: Don't skip Fragments returned from components
  // let isTopLevelFragment =
  //   tmp != null && tmp.type === Fragment && tmp.key == null;
  // let renderResult = isTopLevelFragment ? tmp.props.children : tmp;

  // == SHALLOW RENDER CHANGE: Don't render children
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
export function commitRoot(commitQueue: any[], root: ComponentVNode) {
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

export function unmount(vnode: InternalVNode) {
  // ===== COPIED FROM PREACT SOURCE =====

  let r;
  if (options.unmount) options.unmount(vnode);

  // == SHALLOW RENDER CHANGE: Don't invoke refs
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

  // == SHALLOW RENDER CHANGE: Don't unmount children
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

  // == SHALLOW RENDER CHANGE: Don't remove DOM nodes
  // if (!skipRemove && vnode._dom != null) {
  // 	removeNode(vnode._dom);
  // }

  // Must be set to `undefined` to properly clean up `_nextDom`
  // for which `null` is a valid value. See comment in `create-element.js`
  vnode._parent = vnode._dom = vnode._nextDom = undefined as any;
}

export function shallowSetState(
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

export function shallowForceUpdate(
  this: InternalComponentType,
  callback: () => void
) {
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

  let renderer = (component as unknown as ShallowRenderedComponent)
    ._preactShallowRenderer;
  renderer?.render(newVNode, component._globalContext);
}
