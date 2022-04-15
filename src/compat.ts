/**
 * Helper functions to enable this library to work with different versions of
 * Preact.
 */

import { Component, Fragment, VNode } from 'preact';

import {
  getDOMNode,
  getComponent,
  getChildren,
  getLastVNodeRenderedIntoContainer,
} from './preact10-internals.js';

import { toArray } from './util.js';

export { render } from 'preact';

/**
 * Search a tree of Preact v10 VNodes for the one that produced a given DOM element.
 */
function findVNodeForDOM(
  vnode: VNode,
  el: Node,
  filter: (v: VNode) => boolean
): VNode | null {
  if (getDOMNode(vnode) === el && filter(vnode)) {
    return vnode;
  }

  // Test children of this vnode.
  const children = getChildren(vnode);
  if (children) {
    for (const child of children) {
      if (typeof child === 'string') {
        continue;
      }
      const match = findVNodeForDOM(child, el, filter);
      if (match) {
        return match;
      }
    }
  }

  return null;
}

/**
 * Find the `Component` instance that produced a given DOM node.
 */
export function componentForDOMNode(el: Node): Component | null {
  // Search up the tree until we find the container that the root vnode was
  // rendered into, then traverse the vnode tree to find the component vnode
  // that produced the DOM element.
  let parentEl = el.parentNode;
  let rootVNode = null;
  while (parentEl && !rootVNode) {
    rootVNode = getLastVNodeRenderedIntoContainer(parentEl);
    parentEl = parentEl.parentNode;
  }

  if (rootVNode) {
    const vnode = findVNodeForDOM(rootVNode, el, v => v.type !== Fragment);
    if (vnode) {
      return getComponent(vnode);
    }
  }

  return null;
}

/**
 * Return the children of a VNode.
 */
export function childElements(el: VNode): (VNode | string | null)[] {
  if (typeof el.props !== 'object' || el.props == null) {
    return [];
  }
  if (typeof el.props.children !== 'undefined') {
    return toArray(el.props.children);
  }
  return [];
}
