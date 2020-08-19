import { Component, VNode } from 'preact';
import {
  getComponentVNode,
  getChildren,
} from 'preact/shared-internals';
export { getChildren, getComponent, getDom as getDOMNode } from 'preact/shared-internals';

/**
 * This module provides access to internal properties of Preact 10 VNodes,
 * components and DOM nodes rendered by Preact.
 */

/**
 * A DOM element or text node created by Preact as a result of rendering.
 */
interface PreactNode extends ChildNode {
  // Original name: `_children`.
  __k: VNode;
}

/**
 * Return the last VNode that was rendered into a container using Preact's
 * `render` function.
 */
export function getLastVNodeRenderedIntoContainer(container: Node) {
  const preactContainer = container as PreactNode;
  return preactContainer.__k;
}

/**
 * Return the VNode returned when `component` was last rendered.
 */
export function getLastRenderOutput(component: Component) {
  return getChildren(getComponentVNode(component));
}
