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
import { Component, Fragment, VNode } from 'preact';
import flatMap from 'array.prototype.flatmap';

import { childElements } from './compat';
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
type RSTNodeTypes = RSTNode | string | null;

function stripSpecialProps(props: Props) {
  const { children, key, ref, ...otherProps } = props;
  return otherProps;
}

function convertDOMProps(props: Props) {
  const srcProps = stripSpecialProps(props);
  const converted: Props = {};
  Object.keys(srcProps).forEach(srcProp => {
    const destProp = srcProp === 'class' ? 'className' : srcProp;
    converted[destProp] = props[srcProp];
  });
  return converted;
}

function rstNodesFromChildren(nodes: PreactVNode[] | null): RSTNodeTypes[] {
  if (!nodes) {
    return [];
  }
  return flatMap(nodes, (node: PreactVNode | null) => {
    const rst = rstNodeFromVNode(node);
    return Array.isArray(rst) ? rst : [rst];
  });
}

function rstNodeFromVNode(
  node: PreactVNode | null
): RSTNodeTypes | RSTNodeTypes[] {
  if (node == null) {
    return null;
  }
  if (node.text !== null) {
    return String(node.text);
  }
  if (node._component) {
    return rstNodeFromComponent(node._component);
  }
  if (node.type === Fragment) {
    return rstNodesFromChildren(node._children);
  }

  if (!node._dom) {
    throw new Error(
      `Expected VDOM node to be a DOM node but got ${node.type!}`
    );
  }

  return {
    nodeType: 'host',
    type: node.type!,
    props: convertDOMProps(node.props),
    key: node.key || null,
    ref: node.ref || null,
    instance: node._dom,
    rendered: rstNodesFromChildren(node._children),
  };
}

function nodeTypeFromType(type: any): NodeType {
  if (typeof type === 'string') {
    return 'host';
  } else if (typeof type.prototype.render === 'function') {
    return 'class';
  } else if (typeof type === 'function') {
    return 'function';
  } else {
    throw new Error(`Unknown node type: ${type}`);
  }
}

/**
 * Convert a JSX element tree returned by Preact's `h` function into an RST
 * node.
 *
 * This function accepts vnodes produced by both Preact 10 and earlier versions.
 * Since the elements have not been rendered, none of the private properties
 * which store references to the associated DOM element, component instance etc.
 * will have been set.
 */
export function rstNodeFromElement(node: VNode | null | string): RSTNodeTypes {
  if (node == null || typeof node === 'string') {
    return node;
  }
  const children = childElements(node).map(rstNodeFromElement);
  const nodeType = nodeTypeFromType(node.type);
  const props =
    nodeType === 'host'
      ? convertDOMProps(node.props)
      : stripSpecialProps(node.props);

  const ref = node.ref || node.props.ref || null;

  return {
    nodeType,
    type: node.type as NodeType,
    props,
    key: node.key || null,
    ref,
    instance: null,
    rendered: children,
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

  let rendered: RSTNodeTypes | RSTNodeTypes[] = rstNodeFromVNode(
    component._prevVNode
  );

  // If this was a shallow-rendered component, set the RST node's type to the
  // real component function/class.
  const shallowRenderedType = getRealType(component);
  const type = shallowRenderedType
    ? shallowRenderedType
    : componentType(component);

  let renderedArray: RSTNodeTypes[];
  if (Array.isArray(rendered)) {
    renderedArray = rendered;
  } else if (rendered !== null) {
    renderedArray = [rendered];
  } else {
    renderedArray = [];
  }

  return {
    nodeType,
    type,
    props: { children: [], ...component.props },
    key: component._vnode.key || null,
    ref: component._vnode.ref || null,
    instance: component,
    rendered: renderedArray,
  };
}

/**
 * Convert the Preact components rendered into `container` into an RST node.
 */
export function getNode(container: HTMLElement): RSTNode {
  const vnode = ((container as unknown) as PreactNode)._prevVNode;
  const rstNode = rstNodeFromVNode(vnode);

  // There is currently a requirement that the root element produces a single
  // RST node. Fragments do not appear in the RST tree, so it is fine if the
  // root node is a fragment, provided that it renders only a single child. In
  // fact Preact itself wraps the root element in a single-child fragment.
  if (Array.isArray(rstNode)) {
    if (rstNode.length === 1) {
      return rstNode[0] as RSTNode;
    } else {
      throw new Error(
        'Root element must not be a fragment with multiple children'
      );
    }
  } else {
    return rstNode as RSTNode;
  }
}
