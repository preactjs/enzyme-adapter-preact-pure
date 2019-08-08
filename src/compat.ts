/**
 * Helper functions to enable this library to work with different versions of
 * Preact.
 */

import { Component, Fragment, VNode, h, render as preactRender } from 'preact';

import {
  getDOMNode,
  getComponent,
  getChildren,
  getLastVNodeRenderedIntoContainer,
} from './preact10-internals';

import { componentForNode } from './preact8-internals';

import { toArray, isPreact10 } from './util';

/**
 * Add `type` and  `props` properties to Preact elements as aliases of
 * `nodeName` and `attributes`.
 *
 * This only applies to older versions of Preact. Preact 10 uses the
 * names `type` and `props` already.
 *
 * This normalizes VNodes across different versions of Preact and also Enzyme
 * internally depends on the node type and properties object being exposed
 * under these names.
 */
export function addTypeAndPropsToVNode() {
  // nb. VNodes are class instances in Preact <= 8 but object literals in
  // Preact 10.
  if ('type' in h('div', {})) {
    // Extra properties have already been added.
    return;
  }

  // We could add these properties using a VNode hook, but since older versions
  // of Preact use a class for VNodes, we can also add accessors on the
  // prototype.
  const VNode = h('div', {}).constructor;
  Object.defineProperty(VNode.prototype, 'type', {
    get() {
      return this.nodeName;
    },

    set(val) {
      this.nodeName = val;
    },

    configurable: true,
  });
  Object.defineProperty(VNode.prototype, 'props', {
    get() {
      return this.attributes || {};
    },

    configurable: true,
  });
}

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
  // In Preact <= 8 this is easy, as rendered nodes have `_component` expando
  // property.
  if ('_component' in el) {
    return componentForNode(el);
  }

  // In Preact 10 we have to search up the tree until we find the container
  // that the root vnode was rendered into, then traverse the vnode tree to
  // find the component vnode that produced the DOM element.
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

export function render(el: VNode, container: HTMLElement) {
  if (isPreact10()) {
    preactRender(el, container);
  } else {
    const preact8Render = preactRender as any;
    preact8Render(el, container, container.firstChild);
  }
}

/**
 * Return the children of a VNode.
 */
export function childElements(el: VNode): (VNode | string | null)[] {
  if (isPreact10()) {
    if (typeof el.props !== 'object' || el.props == null) {
      return [];
    }
    if (typeof el.props.children !== 'undefined') {
      return toArray(el.props.children);
    }
  } else {
    if (typeof el.children !== 'undefined') {
      return el.children;
    }
  }
  return [];
}
