import { ComponentFactory, Component, h } from 'preact';

function getDisplayName(type: ComponentFactory<any>) {
  return type.displayName || type.name;
}

export function getRealType(component: Component) {
  const ctor = component.constructor as any;
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
export function makeShallowRenderComponent(type: ComponentFactory<any>) {
  function ShallowRenderStub() {
    return h('shallow-render', { component: getDisplayName(type) });
  }
  ShallowRenderStub.originalType = type;
  ShallowRenderStub.displayName = getDisplayName(type);
  return ShallowRenderStub;
}
