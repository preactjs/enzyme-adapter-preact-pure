import { RSTNode } from 'enzyme';
import { VNode } from 'preact';

export function getType(obj: Object) {
  if (obj == null) {
    return String(obj);
  }
  return obj.constructor.name;
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

export function getDisplayName(node: RSTNode): string {
  if (node.nodeType === 'host') {
    return node.type as string;
  } else {
    const type = node.type as any;
    return type.displayName || type.name;
  }
}

/**
 * Call `fn` with a method on an object temporarily replaced with `methodImpl`.
 */
export function withReplacedMethod(
  obj: any,
  method: string,
  methodImpl: Function,
  fn: Function
) {
  const hadOwnMethod = obj.hasOwnProperty(method);
  const origMethod = obj[method] as Function;
  if (typeof origMethod !== 'function') {
    throw new Error(`Expected '${method}' property to be a function`);
  }
  obj[method] = methodImpl;
  try {
    fn();
  } finally {
    if (hadOwnMethod) {
      obj[method] = origMethod;
    } else {
      delete obj[method];
    }
  }
}

export function toArray(obj: any) {
  return Array.isArray(obj) ? obj : [obj];
}
