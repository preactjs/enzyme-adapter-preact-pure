import { VNode, h } from 'preact';

export function getType(obj: Object) {
  if (obj == null) {
    return String(obj);
  }
  return obj.constructor.name;
}

export function isPreact10() {
  return '_component' in h('div', {});
}

/**
 * Return the type of a vnode as a string.
 */
export function nodeType(vnode: VNode) {
  if (!vnode.type) {
    return 'null';
  }
  return typeof vnode.type === 'string' ? vnode.type : vnode.type.name;
}
