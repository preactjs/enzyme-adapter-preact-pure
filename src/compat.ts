/**
 * Helper functions to enable this library to work with different versions of
 * Preact.
 */

import { VNode, h, render as preactRender } from 'preact';

import { PreactComponent, PreactNode, PreactVNode } from './preact-internals';
import { isPreact10 } from './util';

/**
 * Add `type` and  `props` properties to Preact elements as aliases of
 * `nodeName` and `attributes`.
 *
 * This only applies to older versions of Preact. Preact 9 and 10 use the
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
  });
  Object.defineProperty(VNode.prototype, 'props', {
    get() {
      return this.attributes;
    },
  });
}

/**
 * Search a tree of Preact v10 VNodes for the one that produced a given DOM element.
 */
function findVNodeForDOM(
  vnode: PreactVNode,
  el: PreactNode
): PreactVNode | null {
  // Test the current vnode itself.
  if (vnode._dom === el) {
    return vnode;
  }

  // Test children of this vnode.
  if (vnode._children) {
    for (const child of vnode._children) {
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
  if (vnode._component) {
    return findVNodeForDOM(vnode._component._prevVNode, el);
  }

  return null;
}

/**
 * Find the `Component` instance associated with a rendered DOM element.
 */
export function componentForDOMNode(
  el: Node | PreactNode
): PreactComponent | null {
  // In Preact <= 9 this is easy, as rendered nodes have `_component` expando
  // property.
  if ('_component' in el) {
    return el._component;
  }

  // In Preact 10 we have to search up the tree until we find the root element
  // which has a `_prevVNode` expando property, and then traverse the tree of
  // VNodes until we find one with a matching `_dom` property.
  const targetEl = el;
  while (el) {
    el = (el.parentNode as unknown) as PreactNode;
    if (el && '_prevVNode' in el) {
      const vnode = findVNodeForDOM(el._prevVNode, targetEl as PreactNode);
      if (vnode) {
        return vnode._component;
      }
    }
  }
  return null;
}

export function render(el: VNode, container: HTMLElement) {
  if (isPreact10) {
    preactRender(el, container);
  } else {
    const preact9Render = preactRender as any;
    preact9Render(el, container, container.firstChild);
  }
}
