/**
 * Helper functions to enable this library to work with different versions of
 * Preact.
 */

import { Component, VNode, h, render as preactRender } from 'preact';

import {
  getDOMNode,
  getComponent,
  getChildren,
  getLastRenderOutput,
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
  });
  Object.defineProperty(VNode.prototype, 'props', {
    get() {
      return this.attributes || {};
    },
  });
}

/**
 * Search a tree of Preact v10 VNodes for the one that produced a given DOM element.
 */
function findVNodeForDOM(vnode: VNode, el: Node): VNode | null {
  // Test the current vnode itself.
  if (getDOMNode(vnode) === el) {
    return vnode;
  }

  // Test children of this vnode.
  const children = getChildren(vnode);
  if (children) {
    for (const child of children) {
      if (typeof child === 'string') {
        continue;
      }
      const match = findVNodeForDOM(child, el);
      if (match) {
        return match;
      }
    }
  }

  // Test the rendered output of this vnode.
  const component = getComponent(vnode);
  if (component) {
    const rendered = getLastRenderOutput(component);
    for (let v of rendered) {
      const match = findVNodeForDOM(v, el);
      if (match) {
        return match;
      }
    }
    return null;
  }

  return null;
}

/**
 * Find the `Component` instance associated with a rendered DOM element.
 */
export function componentForDOMNode(el: Node): Component | null {
  // In Preact <= 8 this is easy, as rendered nodes have `_component` expando
  // property.
  if ('_component' in el) {
    return componentForNode(el);
  }

  // In Preact 10 we have to search up the tree until we find the root element
  // which has a `_prevVNode` expando property, and then traverse the tree of
  // VNodes until we find one with a matching `_dom` property.
  const targetEl = el;
  let parentEl = el.parentNode;
  while (parentEl) {
    const rendered = getLastVNodeRenderedIntoContainer(parentEl);
    if (rendered) {
      const vnode = findVNodeForDOM(rendered, targetEl);
      if (vnode) {
        return getComponent(vnode);
      }
    }
    parentEl = parentEl.parentNode;
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
