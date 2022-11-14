/**
 * Functions for rendering components using Preact v10 and converting the result
 * to a React Standard Tree (RST) format defined by Enzyme.
 *
 * Preact 10 stores details of the rendered elements on internal fields of
 * the VNodes. A reference to the vnode is stored in the root DOM element.
 * The rendered result is converted to RST by traversing these vnode references.
 */

import type { NodeType, RSTNodeTypes, RSTNode } from 'enzyme';
import type { Component, ComponentChild, VNode } from 'preact';
import { isValidElement, Fragment } from 'preact';

import { childElements } from './compat.js';
import {
  getChildren,
  getComponent,
  getDOMNode,
  getLastRenderOutput,
  getLastVNodeRenderedIntoContainer,
} from './preact10-internals.js';
import { getRealType } from './shallow-render-utils.js';

type Props = { [prop: string]: any };

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

/**
 * Convert the rendered output of a vnode to RST nodes.
 */
function rstNodesFromChildren(nodes: (VNode | null)[] | null): RSTNodeTypes[] {
  if (!nodes) {
    return [];
  }
  return nodes.flatMap(node => {
    if (node === null) {
      // The array of rendered children may have `null` entries as a result of
      // eg. conditionally rendered children where the condition was false.
      //
      // These are omitted from the rendered tree that Enzyme works with.
      return [];
    }
    const rst = rstNodeFromVNode(node);
    return Array.isArray(rst) ? rst : [rst];
  });
}

function rstNodeFromVNode(node: VNode | null): RSTNodeTypes | RSTNodeTypes[] {
  if (node == null) {
    return null;
  }

  // Preact 10 represents text nodes as VNodes with `node.type == null` and
  // `node.props` equal to the string content.
  if (
    typeof node.props === 'string' ||
    typeof node.props === 'number' ||
    typeof node.props === 'bigint'
  ) {
    return String(node.props);
  }

  if (node.type === Fragment) {
    return rstNodesFromChildren(getChildren(node));
  }

  const component = getComponent(node);
  if (component) {
    return rstNodeFromComponent(node, component);
  }

  if (!getDOMNode(node)) {
    throw new Error(
      `Expected VDOM node to be a DOM node but got ${node.type!}`
    );
  }

  return {
    nodeType: 'host',
    type: node.type!,
    props: convertDOMProps(node.props!),
    key: node.key || null,
    ref: node.ref || null,
    instance: getDOMNode(node),
    rendered: rstNodesFromChildren(getChildren(node)),
  };
}

function nodeTypeFromType(type: any): NodeType {
  if (typeof type === 'string') {
    return 'host';
  } else if (type.prototype && typeof type.prototype.render === 'function') {
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
 */
export function rstNodeFromElement(node: ComponentChild): RSTNodeTypes {
  if (!isValidElement(node)) {
    return node;
  }
  const children = childElements(node).map(rstNodeFromElement);
  const nodeType = nodeTypeFromType(node.type);

  let props = {};
  if (typeof node.props === 'object' && node.props) {
    props =
      nodeType === 'host'
        ? convertDOMProps(node.props)
        : stripSpecialProps(node.props);
  }

  const ref = node.ref || null;

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
function rstNodeFromComponent(vnode: VNode, component: Component): RSTNode {
  const nodeType = nodeTypeFromType(component.constructor);

  const rendered = rstNodesFromChildren(getLastRenderOutput(component));

  // If this was a shallow-rendered component, set the RST node's type to the
  // real component function/class.
  const shallowRenderedType = getRealType(component);
  const type = shallowRenderedType
    ? shallowRenderedType
    : component.constructor;

  return {
    nodeType,
    type,
    props: { children: [], ...component.props },
    key: vnode.key || null,
    ref: vnode.ref || null,
    instance: component,
    rendered,
  };
}

/**
 * Convert the Preact components rendered into `container` into an RST node.
 */
export function getNode(container: HTMLElement): RSTNode {
  const rendered = getLastVNodeRenderedIntoContainer(container);
  const rstNode = rstNodeFromVNode(rendered);

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
