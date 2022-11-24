import { options } from 'preact';
import type { VNode } from 'preact';

/**
 * Make internal properties on VNodes non-enumerable so that deep-equaling
 * VNodes doesn't attempt to compare the internal properties. Comparing VNodes
 * should only look at public properties.
 */
export function installVNodeTestHook() {
  let prevVNodeHook: ((vnode: VNode) => void) | undefined;

  before(() => {
    prevVNodeHook = options.vnode;
    options.vnode = vnode => {
      if (prevVNodeHook) {
        prevVNodeHook(vnode);
      }

      const vnodeKeys = Object.keys(vnode) as (keyof VNode)[];
      for (const fieldName of vnodeKeys) {
        if (fieldName.startsWith('__')) {
          Object.defineProperty(vnode, fieldName, {
            configurable: true,
            enumerable: false,
            writable: true,
            value: vnode[fieldName],
          });
        }
      }
    };
  });

  after(() => {
    options.vnode = prevVNodeHook;
  });
}
