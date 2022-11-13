import type { Component, ComponentChild, JSX } from 'preact';
import { options, isValidElement } from 'preact';

import type { ComponentVNode } from './preact10-internals';
import {
  commitRoot,
  diffComponent,
  getComponent,
  isMemo,
  unmount,
  removeEffectCallbacks,
} from './preact10-internals.js';

export interface PreactComponent<P = any> extends Component<P> {
  // Custom property for the Shallow renderer
  _shallowRenderer: PreactShallowDiff;
}

let diffedInstalled = false;
function installDiffedOption() {
  if (diffedInstalled) {
    return;
  }

  const prevDiffed = options.diffed;
  options.diffed = vnode => {
    removeEffectCallbacks(vnode as any);
    prevDiffed?.(vnode);
  };

  diffedInstalled = true;
}

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

  private _oldVNode: ComponentVNode | null = null;
  private _componentInstance: PreactComponent | null = null;
  private _rendered: ComponentChild = null;
  private _rendering = false;
  private _commitQueue: any[] = [];
  private _memoResultStack: any[] = [];

  constructor() {
    installDiffedOption();
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

    if (this._rendering) {
      return;
    }
    if (this._oldVNode != null && this._oldVNode.type !== element.type) {
      this._reset();
    }

    this._rendering = true;

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
      this._rendering = false;
    }

    return this.getRenderOutput();
  }

  public unmount() {
    if (this._oldVNode) {
      unmount(this._oldVNode);
    }

    this._reset();
  }

  private _reset() {
    this._oldVNode = null;
    this._componentInstance = null;
    this._rendered = null;
    this._rendering = false;

    this._commitQueue = [];
    this._memoResultStack = [];
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
