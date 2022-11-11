import type { Component, ComponentChild, JSX } from 'preact';
import { isValidElement } from 'preact';
import type { ComponentVNode } from './preact10-internals';
import {
  commitRoot,
  diffComponent,
  getComponent,
  unmount,
} from './preact10-internals.js';

export interface PreactComponent<P = any> extends Component<P> {
  // Custom property for the Shallow renderer
  _renderer: PreactShallowRenderer;
}

export default class PreactShallowRenderer {
  static createRenderer = function () {
    return new PreactShallowRenderer();
  };

  private _oldVNode: ComponentVNode | null = null;
  private _componentInstance: PreactComponent | null = null;
  private _rendered: ComponentChild = null;
  private _rendering = false;
  private _commitQueue: any[] = [];

  constructor() {
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
      this._diffComponent(element, context);
      this._commitRoot(element);

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
  }

  private _diffComponent(newVNode: ComponentVNode<any>, globalContext: any) {
    this._commitQueue = [];

    const renderResult = diffComponent(
      newVNode,
      this._oldVNode ?? ({} as ComponentVNode),
      globalContext,
      this._commitQueue,
      this._rendered
    );

    this._componentInstance = getComponent(newVNode) as PreactComponent;
    this._componentInstance._renderer = this;
    this._rendered = renderResult;
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
      `PreactShallowRenderer render(): Invalid component element. ${
        typeof element === 'function'
          ? 'Instead of passing a component class, make sure to instantiate it by passing it to Preact.createElement.'
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
