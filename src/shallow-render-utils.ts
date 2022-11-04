import type { ComponentFactory, Component, VNode } from 'preact';
import { createElement } from 'preact';
import { Fragment, options } from 'preact';

import { childElements } from './compat.js';

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
const shallowRenderComponents = new Map<Function, Function>();

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
  const c = component as Component;
  const ctor = c.constructor as ShallowRenderFunction;

  if (ctor.originalType) {
    return ctor.originalType;
  } else {
    return null;
  }
}

/**
 * Return true if a value is something that can be returned from a render
 * function.
 */
function isRenderable(value: any) {
  return (
    value === null ||
    Array.isArray(value) ||
    typeof value == 'number' ||
    typeof value === 'string' ||
    (typeof value === 'object' && value.type !== undefined)
  );
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
    // Preact can render fragments, so we can return the children directly.
    //
    // There is an exception for `children` values which are not directly
    // renderable but need to be processed by the component being stubbed.
    // For example, a function used as part of the "render prop" pattern
    // (https://reactjs.org/docs/render-props.html).
    return isRenderable(children) ? children : null;
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
 * Prevent double patching root VNodes which happens on rerender in some enzyme
 * methods. It contains which components have already been patched.
 */
const patchCache: WeakSet<Function> = new WeakSet();

/**
 * Patch the root node of a render such that if it is a component:
 * 1. We preserve its raw rendered output. So if it returns a Fragment, that
 *    fragment shows up as an RSTNode
 * 2. Calls to the component's render method are wrapped in the
 *    `withShallowRendering` helper to ensure they continue to shallow render
 */
export function patchShallowRoot(root: VNode) {
  if (typeof root.type === 'function') {
    if (patchCache.has(root.type)) {
      return;
    }

    const rootType = root.type;
    const originalRender = rootType.prototype?.render ?? rootType;
    function EnzymePatchedRender(this: any, ...args: any[]) {
      let result;
      withShallowRendering(() => {
        result = originalRender.call(this, ...args);
      });

      // Wrap result in a Fragment that Preact will immediately remove. Preact
      // skips over un-keyed Fragments returned from components. But for Enzyme
      // shallow rendering, it is important we preserve them so methods like
      // `wrapper.setState` and `wrapper.update` work when shallow rendered.
      return createElement(Fragment, null, result);
    }

    if (rootType.prototype?.render) {
      rootType.prototype.render = EnzymePatchedRender;
    } else {
      root.type = EnzymePatchedRender;
      (root.type as any).originalType = rootType;
      // Give the wrapper a default display name
      root.type.displayName = getDisplayName(rootType);

      // Copy over static properties like defaultProps and displayName
      Object.keys(rootType).forEach(key => {
        (root.type as any)[key] = (rootType as any)[key];
      });
    }

    patchCache.add(root.type);
  }
}

/**
 * Return true if a VNode has been modified to shallow-render.
 */
export function isShallowRendered(vnode: VNode) {
  if (vnode.type == null || typeof vnode.type === 'string') {
    return false;
  }
  const type = vnode.type as unknown as ShallowRenderFunction;
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
