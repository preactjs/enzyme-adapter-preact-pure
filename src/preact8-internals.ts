import { Component } from 'preact';

/**
 * This module provides access to internal properties of Preact 8 components and
 * DOM nodes rendered by Preact.
 *
 * The original property names (in the Preact source) are replaced with shorter
 * ones (they are "mangled") during the build.
 */

interface Preact8Component extends Component {
  // Preact <= 8.
  __k: string | null;
  __r: Function | null;
}

interface Preact8Node extends ChildNode {
  _component: Preact8Component;

  /** Props used to render a DOM node. */
  __preactattr_: Object;
}

export function componentForNode(node: Node) {
  return (node as Preact8Node)._component;
}

export function propsForNode(node: Node) {
  return (node as Preact8Node).__preactattr_ || {};
}

export function componentKey(component: Component) {
  return (component as Preact8Component).__k;
}

export function componentRef(component: Component) {
  return (component as Preact8Component).__r;
}
