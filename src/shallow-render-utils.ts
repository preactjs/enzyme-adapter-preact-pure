import { ComponentFactory, Component, Fragment, h, options } from 'preact';

import { PreactComponent, VNodeExtensions } from './preact-internals';

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
  const c = component as PreactComponent;
  if (c._constructor) {
    ctor = c._constructor;
  } else {
    ctor = c.constructor;
  }
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
function makeShallowRenderComponent(type: ComponentFactory<any>) {
  function ShallowRenderStub() {
    return h('shallow-render', { component: getDisplayName(type) });
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
    !shallowRenderActive ||
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
    shallowRenderVNode(vnode as VNodeExtensions);
    if (prevHook) {
      prevHook(vnode);
    }
  };
  shallowRenderHookInstalled = true;
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
