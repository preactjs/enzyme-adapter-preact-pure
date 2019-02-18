/**
 * Functions for rendering components using Preact "X" (v10 and later) and
 * converting the result to a React Standard Tree (RST) format defined by
 * Enzyme.
 *
 * Preact 10+ stores details of the rendered elements on internal fields of
 * the VNodes. A reference to the vnode is stored in the root DOM element.
 * The rendered result is converted to RST by traversing these vnode references.
 */

import { NodeType, RSTNode } from 'enzyme';
import { Component } from 'preact';

import { PreactComponent, PreactNode, PreactVNode } from './preact-internals';
import { getRealType } from './shallow-render-utils';
import { getType } from './util';

function componentType(c: PreactComponent) {
  if (c._constructor) {
    // This is a functional component. The component is an instance of
    // `Component` but the function is stored in the `_constructor` field.
    return c._constructor;
  }
  return c.constructor;
}

type Props = { [prop: string]: any };

function convertDOMProps(props: Props) {
  const converted: Props = {
    children: props.children || [],
  };

  Object.keys(props).forEach(srcProp => {
    if (srcProp === 'children' || srcProp === 'ref' || srcProp === 'key') {
      return;
    }
    const destProp = srcProp === 'class' ? 'className' : srcProp;
    converted[destProp] = props[srcProp];
  });

  return converted;
}

function rstNodeFromVNode(node: PreactVNode): RSTNode | string | null {
  if (node == null) {
    return null;
  }
  if (node.text !== null) {
    return String(node.text);
  }
  if (node._component) {
    return rstNodeFromComponent(node._component);
  }
  return {
    nodeType: 'host',
    type: node.type!,
    props: convertDOMProps(node.props),
    key: node.key || null,
    ref: node.ref || null,
    instance: node._dom,
    rendered: (node._children || []).map(rstNodeFromVNode),
  };
}

/**
 * Return a React Standard Tree (RST) node from a Preact `Component` instance.
 */
function rstNodeFromComponent(component: PreactComponent): RSTNode {
  if (!(component instanceof Component)) {
    throw new Error(
      `Expected argument to be a Component but got ${getType(component)}`
    );
  }

  let nodeType: NodeType;
  if (component._constructor) {
    nodeType = 'function';
  } else {
    nodeType = 'class';
  }

  let rendered: string | RSTNode | null = rstNodeFromVNode(
    component._prevVNode
  );

  // If this was a shallow-rendered component, set the RST node's type to the
  // real component function/class.
  const shallowRenderedType = getRealType(component);
  if (shallowRenderedType) {
    // Shallow rendering replaces the output of the component with a dummy
    // DOM element. Remove this dummy from the RST so that Enzyme does not see
    // it.
    rendered = null;
  }
  const type = shallowRenderedType
    ? shallowRenderedType
    : componentType(component);

  return {
    nodeType,
    type,
    props: { children: [], ...component.props },
    key: component._vnode.key || null,
    ref: component._vnode.ref || null,
    instance: component,
    rendered: rendered !== null ? [rendered] : [],
  };
}

/**
 * Convert the Preact components rendered into `container` into an RST node.
 */
export function getNode(container: HTMLElement): RSTNode {
  const vnode = ((container as unknown) as PreactNode)._prevVNode;
  if (vnode._children && vnode._children.length === 1) {
    return rstNodeFromVNode(vnode._children[0]) as RSTNode;
  } else {
    return rstNodeFromVNode(vnode) as RSTNode;
  }
}
