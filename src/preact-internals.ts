import { Component, VNode } from 'preact';

/**
 * An instance of Preact's `Component` class or a subclass created by
 * rendering.
 */
export interface PreactComponent extends Component {
  __key: string | null;
  __ref: Function | null;
}

/**
 * A DOM element or text node created by Preact as a result of rendering.
 */
export interface PreactNode extends ChildNode {
  _component: PreactComponent;
  _componentConstructor: Function;

  /** The normalized (lower-cased) DOM node name. */
  __n: string;

  /** Props used to render a DOM node. */
  __preactattr_: Object;
}

/**
 * Additional properties added to Preact VNode elements by the adapter.
 */
export interface VNodeExtensions extends VNode {
  originalType: Function;
}
