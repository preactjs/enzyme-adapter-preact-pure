import { Component, VNode } from 'preact';

/**
 * This module provides extended typings for Preact's `Component` and `VNode`
 * classes which include internal properties.
 *
 * The original property names (in the Preact source) are replaced with shorter
 * ones (they are "mangled") during the build. The mapping from original name to
 * short name is fixed, see `mangle.json` in the Preact source tree.
 */

/**
 * An instance of Preact's `Component` class or a subclass created by
 * rendering.
 */
export interface PreactComponent extends Component {
  // Preact 10.

  // Original name: `_prevVNode`.
  __t: PreactVNode;

  // Original name: `_vnode`.
  __v: PreactVNode;

  // Preact <= 9.
  __k: string | null;
  __r: Function | null;
}

/**
 * A DOM element or text node created by Preact as a result of rendering.
 */
export interface PreactNode extends ChildNode {
  // Preact 10.

  // Original name: `_prevVNode`.
  __t: PreactVNode;

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

  // Original name: `_dom`.
  __e: PreactNode | null;

  // Original name: `_component`.
  __c: PreactComponent | null;

  // Original name: `_children`.
  __k: PreactVNode[] | null;
}

/**
 * Additional properties added to Preact VNode elements by the adapter.
 */
export interface VNodeExtensions extends VNode {
  originalType: Function;
}

/**
 * Return the VNode representing the rendered output of a component.
 */
export function getRenderedVNode(
  componentOrNode: PreactComponent | PreactNode
) {
  return componentOrNode.__t;
}

/**
 * Return the rendered DOM node associated with a VNode.
 */
export function getDOMNode(node: PreactVNode): PreactNode | null {
  return node.__e;
}

/**
 * Return the `Component` instance associated with a VNode.
 */
export function getComponent(node: PreactVNode): PreactComponent | null {
  return node.__c;
}

/**
 * Return the child VNodes associated with a VNode.
 */
export function getChildren(node: PreactVNode) {
  return node.__k;
}
