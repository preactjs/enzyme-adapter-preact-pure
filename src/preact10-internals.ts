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
  __t: VNode;

  // Original name: `_vnode`.
  __v: VNode;
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
  __e: Node | null;

  // Original name: `_component`.
  __c: Component | null;

  // Original name: `_children`.
  __k: VNode[] | null;
}

/**
 * Return the VNode representing the rendered output of a component.
 */
export function getRenderedVNode(componentOrNode: Component | Node) {
  // Although these two branches currently access a property with the same name,
  // keep them because they are accessing different objects.
  if (componentOrNode instanceof Node) {
    return (componentOrNode as PreactNode).__t;
  } else {
    return (componentOrNode as PreactComponent).__t;
  }
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
export function getDOMNode(node: VNode): Node | null {
  return (node as PreactVNode).__e;
}

/**
 * Return the `Component` instance associated with a VNode.
 */
export function getComponent(node: VNode): Component | null {
  return (node as PreactVNode).__c;
}

/**
 * Return the child VNodes associated with a VNode.
 */
export function getChildren(node: VNode) {
  return (node as PreactVNode).__k;
}
