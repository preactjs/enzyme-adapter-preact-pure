import { NodeType, RSTNode } from 'enzyme';

import { PreactComponent, PreactNode } from './preact-internals';
import { getRealType } from './shallow-render-utils';

/**
 * Return a React Standard Tree (RST) node from a DOM element which might
 * be the root output of a rendered component.
 */
export function rstNodeFromDOMElementOrComponent(domElement: PreactNode) {
  if (domElement._component) {
    return rstNodeFromComponent(domElement._component);
  } else {
    return rstNodeFromDOMElement(domElement);
  }
}

function rstNodesFromDOMNodes(nodes: Node[]) {
  return nodes
    .map(node => {
      switch (node.nodeType) {
        case Node.ELEMENT_NODE:
          return rstNodeFromDOMElementOrComponent(node as PreactNode);
        case Node.TEXT_NODE:
          return node.nodeValue;
        default:
          return null;
      }
    })
    .filter(node => node !== null);
}

/**
 * Return a React Standard Tree (RST) node from a host (DOM) element.
 */
function rstNodeFromDOMElement(domElement: PreactNode): RSTNode {
  const hostProps = domElement.__preactattr_ || {};
  return {
    nodeType: 'host',
    type: domElement.__n,
    props: {
      children: (hostProps as any).children || [],
      ...hostProps,
    },
    key: null,
    ref: null,
    instance: domElement,
    rendered: rstNodesFromDOMNodes(Array.from(domElement.childNodes)),
  };
}

/**
 * Return a React Standard Tree (RST) node from a Preact `Component` instance.
 */
function rstNodeFromComponent(component: PreactComponent): RSTNode {
  let nodeType: NodeType;
  try {
    if (component instanceof component.constructor) {
      // Component was created with `new ComponentSubclass`.
      nodeType = 'class';
    } else {
      // Component was created using `new Component`. Preact sets the constructor
      // to the component function but component isn't really an instance of
      // that function.
      nodeType = 'function';
    }
  } catch {
    // The `instanceof` check above can throw if `component.constructor` is an
    // arrow function.
    nodeType = 'function';
  }

  let rendered: RSTNode | null;
  if ((component as any)._component) {
    // This component rendered another component.
    rendered = rstNodeFromComponent((component as any)._component);
  } else {
    // This component rendered a host node.
    rendered = rstNodeFromDOMElement(component.base as any);
  }

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
    : component.constructor;

  return {
    nodeType,
    type,
    props: component.props,
    key: component.__key || null,
    ref: component.__ref || null,
    instance: component,
    rendered: rendered ? [rendered] : [],
  };
}
