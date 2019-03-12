import { Component, VNode } from 'preact';

/**
 * This module provides access to internal properties of Preact 10 VNodes,
 * components and DOM nodes rendered by Preact.
 *
 * The original property names (in the Preact source) are replaced with shorter
 * ones (they are "mangled") during the build. The mapping from original name to
 * short name is fixed, see `mangle.json` in the Preact source tree.
 */

/**
 * An instance of Preact's `Component` class or a subclass created by
 * rendering.
 */
interface PreactComponent extends Component {
  // Original name: `_prevVNode`.
  __t: PreactVNode;

  // Original name: `_vnode`.
  __v: PreactVNode;
}

/**
 * A DOM element or text node created by Preact as a result of rendering.
 */
interface PreactNode extends ChildNode {
  // Original name: `_prevVNode`.
  __t: PreactVNode;
}

interface PreactVNode extends VNode {
  // Original name: `_dom`.
  __e: PreactNode | null;

  // Original name: `_component`.
  __c: PreactComponent | null;

  // Original name: `_children`.
  __k: PreactVNode[] | null;
}

/**
 * Return the VNode representing the rendered output of a component.
 */
export function getRenderedVNode(componentOrNode: Component | Node) {
  return (componentOrNode as PreactComponent).__t;
}

/**
 * Return the VNode that rendered a component.
 *
 * Note that this is the VNode that caused the component to be rendered, _not_
 * the VNodes that were rendered by the component's `render` function. That can
 * be obtained using `getRenderedVNode`.
 */
export function getVNode(component: Component) {
  return (component as PreactComponent).__v;
}

/**
 * Return the rendered DOM node associated with a VNode.
 */
export function getDOMNode(node: VNode): PreactNode | null {
  return (node as PreactVNode).__e;
}

/**
 * Return the `Component` instance associated with a VNode.
 */
export function getComponent(node: VNode): PreactComponent | null {
  return (node as PreactVNode).__c;
}

/**
 * Return the child VNodes associated with a VNode.
 */
export function getChildren(node: VNode) {
  return (node as PreactVNode).__k;
}
