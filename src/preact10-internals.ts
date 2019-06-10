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
  // Original name: `_vnode`.
  __v: VNode;

  // Original name: `_prevVNode`.
  // Only present in Preact <= 10.0.0.beta.2.
  __t: VNode;
}

/**
 * A DOM element or text node created by Preact as a result of rendering.
 */
interface PreactNode extends ChildNode {
  // Original name: `_children`.
  __k: PreactVNode;

  // Original name: `_prevVNode`.
  // Only present in Preact <= 10.0.0.beta.2, replaced by `_children`.
  __t: VNode;
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
 * Return the last VNode that was rendered into a container using Preact's
 * `render` function.
 */
export function getLastVNodeRenderedIntoContainer(container: Node) {
  const preactContainer = container as PreactNode;

  // Preact 10 Beta 2 and earlier.
  if (preactContainer.__t) {
    return preactContainer.__t;
  }

  // Preact 10 Beta 3 and later.
  return preactContainer.__k;
}

/**
 * Return the VNode returned when `component` was last rendered.
 */
export function getLastRenderOutput(component: Component) {
  const preactComponent = component as PreactComponent;

  // Preact 10 Beta 2 and earlier.
  if (preactComponent.__t) {
    return [preactComponent.__t];
  }

  // Preact 10 Beta 3 and later.
  return getChildren(preactComponent.__v);
}

/**
 * Return the rendered DOM node associated with a rendered VNode.
 *
 * "Associated" here means either the DOM node directly output as a result of
 * rendering the vnode (for DOM vnodes) or the first DOM node output by a
 * child vnode for component vnodes.
 */
export function getDOMNode(node: VNode): Node | null {
  return (node as PreactVNode).__e;
}

/**
 * Return the `Component` instance associated with a rendered VNode.
 */
export function getComponent(node: VNode): Component | null {
  return (node as PreactVNode).__c;
}

/**
 * Return the child VNodes associated with a rendered VNode.
 */
export function getChildren(node: VNode) {
  return (node as PreactVNode).__k!;
}
