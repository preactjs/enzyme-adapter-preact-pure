/**
 * Largely taken and adapted from react-shallow-renderer, which is copyrighted
 * to Facebook and licensed under the MIT License, found a the link below:
 * https://github.com/enzymejs/react-shallow-renderer/blob/802c735ee53bf2d965797760698cacbd46088f66/LICENSE
 */

import type {
  VNode,
  FunctionComponent,
  ComponentClass,
  Options,
  Component as InternalComponentType,
} from 'preact/src/internal';
import type { JSX } from 'preact';
import { Component, options as rawOptions, isValidElement } from 'preact';

const options = rawOptions as Options;

interface ShallowRendererComponentClass extends InternalComponentType {
  _renderer: PreactShallowRenderer;
}

interface ClassComponentVNode<P = {}> extends VNode<P> {
  type: ComponentClass<P>;
}

interface FunctionComponentVNode<P = {}> extends VNode<P> {
  type: FunctionComponent<P>;
}

type ComponentVNode<P = {}> =
  | ClassComponentVNode<P>
  | FunctionComponentVNode<P>;

// const enum OptionsTypes {
//   HOOK = '__h',
//   DIFF = '__b',
//   DIFFED = 'diffed',
//   RENDER = '__r',
//   CATCH_ERROR = '__e',
//   UNMOUNT = 'unmount',
// }
//
// interface OptionsType {
//   [OptionsTypes.HOOK](component: Component, index: number, type: number): void;
//   [OptionsTypes.DIFF](vnode: VNode): void;
//   [OptionsTypes.DIFFED](vnode: VNode): void;
//   [OptionsTypes.RENDER](vnode: VNode): void;
//   [OptionsTypes.CATCH_ERROR](error: any, vnode: VNode, oldVNode: VNode): void;
//   [OptionsTypes.UNMOUNT](vnode: VNode): void;
// }
// type HookFn<T extends keyof OptionsType> = (
//   old: OptionsType[T],
//   ...a: Parameters<OptionsType[T]>
// ) => ReturnType<OptionsType[T]>;
//
// // Install a Preact options hook
// function hook<T extends OptionsTypes>(hookName: T, hookFn: HookFn<T>) {
//   // @ts-ignore-next-line private options hooks usage
//   options[hookName] = hookFn.bind(null, options[hookName] || (() => {}));
// }

export default class PreactShallowRenderer {
  static createRenderer = function () {
    return new PreactShallowRenderer();
  };

  // @ts-ignore
  private _oldVNode: ComponentVNode | null;
  // @ts-ignore
  private _componentInstance: ShallowRendererComponentClass | null;
  // @ts-ignore
  private _rendered: JSX.Element | null;
  // @ts-ignore
  private _rendering: boolean;
  private _commitQueue: any[] = [];

  constructor() {
    this._reset();
  }

  public getMountedInstance() {
    return this._componentInstance;
  }

  public getRenderOutput() {
    return this._rendered;
  }

  public render(element: JSX.Element, context: any = {}) {
    assertIsComponentVNode(element);

    if (this._rendering) {
      return;
    }
    if (this._oldVNode != null && this._oldVNode.type !== element.type) {
      this._reset();
    }

    this._rendering = true;

    // if (this._instance) {
    //   this._updateComponent(element, this._context);
    // } else {
    //   this._mountComponent(element as ComponentVNode, this._context);
    // }
    this._diffComponent(element, context);

    commitRoot(this._commitQueue, element);
    this._commitQueue = [];

    this._oldVNode = element;
    this._rendering = false;

    return this.getRenderOutput();
  }

  public unmount() {
    if (this._oldVNode) {
      if (options.unmount) options.unmount(this._oldVNode!);
    }

    if (this._componentInstance) {
      if (typeof this._componentInstance.componentWillUnmount === 'function') {
        this._componentInstance.componentWillUnmount();
      }
    }

    if (this._oldVNode) {
      if (this._oldVNode._component) {
        (this._oldVNode._component as any)._renderer = null;
      }

      this._oldVNode._component = null;
    }

    this._reset();
  }

  private _reset() {
    this._oldVNode = null;
    this._componentInstance = null;
    this._rendered = null;
    this._rendering = false;

    this._commitQueue = [];
  }

  private _diffComponent(newVNode: ComponentVNode, globalContext: any) {
    console.log('diff');
    /* eslint-disable */
    //========= INIT ==============
    const oldVNode = this._oldVNode ?? ({} as ComponentVNode);
    const commitQueue: any[] = [];
    const parentDom = null;

    let tmp;
    const newType = newVNode.type;

    if (options._diff) options._diff(newVNode);
    //========= END INIT ==============

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
    oldState = c.state;

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
      console.log('update lifecycles');
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

        console.log('Whoooops');
        // break outer;
        return; // === SHALLOW RENDERER DIFF: return instead of break
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

    //========= FOOTER ==============
    if (options.diffed) options.diffed(newVNode);

    this._componentInstance = c;
    this._componentInstance!._renderer = this;
    this._commitQueue = commitQueue;
    this._rendered = renderResult;
    //========= END FOOTER ==============
  }
}

/**
 * Assign properties from `props` to `obj`
 * @template O, P The obj and props types
 * @param {O} obj The object to copy properties to
 * @param {P} props The object to copy properties from
 * @returns {O & P}
 */
export function assign<O, P>(obj: O, props: P) {
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

Component.prototype.setState = function (
  this: ShallowRendererComponentClass,
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

Component.prototype.forceUpdate = function (
  this: ShallowRendererComponentClass,
  callback: () => void
) {
  this._force = true;
  if (callback) this._renderCallbacks.push(callback);
  enqueueRender(this);
};

function enqueueRender(component: ShallowRendererComponentClass) {
  console.log('rerendering');

  let newVNode: VNode = assign({}, component._vnode);
  newVNode._original = newVNode._original + 1;

  component._renderer.render(newVNode, component._globalContext);
}

function assertIsComponentVNode(
  element: JSX.Element
): asserts element is ComponentVNode {
  if (!isValidElement(element)) {
    throw new Error(
      `PreactShallowRenderer render(): Invalid component. ${
        typeof element === 'function'
          ? " Instead of passing a compnoent class, make sure to instantiate it by passing it to Preact's createElement."
          : ''
      }`
    );
  }

  // Show a special message for host elements since it's a common case.
  if (!(typeof element.type !== 'string')) {
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
