import { Component, VNode } from 'preact';

/**
 * An instance of Preact's `Component` class or a subclass created by
 * rendering.
 */
export interface PreactComponent extends Component {
  _constructor: Function;

  // Preact 10.
  _prevVNode: PreactVNode;

  // Preact <= 9.
  __key: string | null;
  __ref: Function | null;
}

/**
 * A DOM element or text node created by Preact as a result of rendering.
 */
export interface PreactNode extends ChildNode {
  // Preact 10.
  _prevVNode: PreactVNode;

  // Preact <= 9.
  _component: PreactComponent;
  _componentConstructor: Function;

  /** The normalized (lower-cased) DOM node name. */
  __n: string;

  /** Props used to render a DOM node. */
  __preactattr_: Object;
}

export interface PreactVNode extends VNode {
  // Preact 10.
  _dom: PreactNode | null;

  _component: PreactComponent | null;
  _children: PreactVNode[] | null;
}

/**
 * Additional properties added to Preact VNode elements by the adapter.
 */
export interface VNodeExtensions extends VNode {
  originalType: Function;
}
