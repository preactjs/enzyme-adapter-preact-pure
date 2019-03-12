import {
  ComponentFactory,
  Component,
  Fragment,
  VNode,
  h,
  options,
} from 'preact';

import { childElements } from './compat';
import { isPreact10 } from './util';

interface ShallowRenderFunction extends Function {
  originalType: Function;
}

/**
 * Additional properties added to Preact VNode elements by the adapter.
 */
export interface VNodeExtensions extends VNode {
  originalType: Function;
}

/**
 * Map of component function to replacement stub function used when shallow
 * rendering.
 */
let shallowRenderComponents = new Map<Function, Function>();

/**
 * Global flag indicating whether shallow rendering is active.
 */
let shallowRenderActive = false;

let shallowRenderHookInstalled = false;

function getDisplayName(type: ComponentFactory<any>) {
  return type.displayName || type.name;
}

/**
 * Return the real component type of a component instance created by
 * shallow rendering.
 */
export function getRealType(component: Component) {
  let ctor: any;
  const c = component as Component;
  ctor = c.constructor;

  if (ctor.originalType) {
    return ctor.originalType;
  } else {
    return null;
  }
}

/**
 * Create a dummy component to replace an existing component in rendered output.
 *
 * The dummy renders nothing but has the same display name as the original.
 * This is used to implement shallow rendering by replacing the real component
 * during shallow renders.
 */
function makeShallowRenderComponent(
  type: ComponentFactory<any>
): ShallowRenderFunction {
  function ShallowRenderStub({ children }: { children?: any }) {
    if (isPreact10()) {
      // Preact 10 can render fragments, so we can return the children directly.
      return children;
    }
    // Older versions of Preact need a dummy DOM element to contain the children.
    return h(
      'shallow-render',
      {
        component: getDisplayName(type),
      },
      children
    );
  }
  ShallowRenderStub.originalType = type;
  ShallowRenderStub.displayName = getDisplayName(type);
  return ShallowRenderStub;
}

/**
 * Preact `options.vnode` hook that causes a component not to be rendered when
 * shallow rendering is enabled.
 */
function shallowRenderVNode(vnode: VNodeExtensions) {
  if (
    typeof vnode.type === 'string' ||
    vnode.type == null ||
    (typeof Fragment !== 'undefined' && vnode.type === Fragment)
  ) {
    return;
  }

  let stub = shallowRenderComponents.get(vnode.type);
  if (!stub) {
    stub = makeShallowRenderComponent(vnode.type);
    shallowRenderComponents.set(vnode.type, stub);
  }
  vnode.type = stub as any;
}

function installShallowRenderHook() {
  if (shallowRenderHookInstalled) {
    return;
  }
  const prevHook = options.vnode;
  options.vnode = vnode => {
    if (shallowRenderActive) {
      shallowRenderVNode(vnode as VNodeExtensions);
    }
    if (prevHook) {
      prevHook(vnode);
    }
  };
  shallowRenderHookInstalled = true;
}

function isVNode(obj: any) {
  return Object(obj) === obj && typeof obj.type !== 'undefined';
}

/**
 * Return true if a VNode has been modified to shallow-render.
 */
export function isShallowRendered(vnode: VNode) {
  if (vnode.type == null || typeof vnode.type === 'string') {
    return false;
  }
  const type = (vnode.type as unknown) as ShallowRenderFunction;
  return typeof type.originalType === 'function';
}

/**
 * Convert components in a VNode tree to shallow-render.
 */
export function shallowRenderVNodeTree(vnode: VNode) {
  shallowRenderVNode(vnode as VNodeExtensions);
  childElements(vnode).forEach(c => {
    if (isVNode(c)) {
      shallowRenderVNodeTree(c as VNodeExtensions);
    }
  });
}

/**
 * Invoke `fn` with shallow rendering enabled in Preact.
 *
 * During the execution of `fn`, any function or class component elements
 * created by Preact's `h` function will be modified to only render a placeholder
 * instead of the real component.
 */
export function withShallowRendering(fn: () => any) {
  installShallowRenderHook();
  try {
    shallowRenderActive = true;
    fn();
  } finally {
    shallowRenderActive = false;
  }
}
