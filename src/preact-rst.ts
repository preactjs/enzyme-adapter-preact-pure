/**
 * Functions for rendering components using Preact "classic" (v9 and below)
 * and converting the result to a React Standard Tree (RST) format defined by
 * Enzyme.
 *
 * Preact <= 9 stores details of the rendered elements on the DOM nodes
 * themselves and updates diff VDOM elements against the DOM. The rendered
 * result is converted to RST by traversing the DOM and Preact-internal
 * metadata attached to DOM nodes.
 */

import { NodeType, RSTNode } from 'enzyme';

import { PreactComponent, PreactNode } from './preact-internals';
import { getRealType } from './shallow-render-utils';

/**
 * Return a React Standard Tree (RST) node from a DOM element which might
 * be the root output of a rendered component.
 */
function rstNodeFromDOMElementOrComponent(domElement: PreactNode) {
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

type Props = { [prop: string]: any };

function convertDOMProps(props: Props) {
  const converted: Props = {
    children: props.children || [],
  };

  Object.keys(props).forEach(srcProp => {
    if (srcProp === 'children' || srcProp === 'key' || srcProp === 'ref') {
      return;
    }
    const destProp = srcProp === 'class' ? 'className' : srcProp;
    converted[destProp] = props[srcProp];
  });

  return converted;
}

/**
 * Return a React Standard Tree (RST) node from a host (DOM) element.
 */
function rstNodeFromDOMElement(domElement: PreactNode): RSTNode {
  const hostProps: Props = domElement.__preactattr_ || {};
  const key = 'key' in hostProps ? hostProps.key : null;
  const ref = 'ref' in hostProps ? hostProps.ref : null;

  return {
    nodeType: 'host',
    type: domElement.__n,
    props: convertDOMProps(hostProps),
    key,
    ref,
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

  let rendered: RSTNode | string | null;
  if ((component as any)._component) {
    // This component rendered another component.
    rendered = rstNodeFromComponent((component as any)._component);
  } else {
    // This component rendered a host node.
    const hostNode = component.base as Node;
    if (hostNode.nodeType === Node.ELEMENT_NODE) {
      rendered = rstNodeFromDOMElement(component.base as any);
    } else {
      rendered = hostNode.textContent;
    }
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
    key: component.__k || null,
    ref: component.__r || null,
    instance: component,
    rendered: rendered ? [rendered] : [],
  };
}

/**
 * Convert the Preact components rendered into `container` into an RST node.
 */
export function getNode(container: HTMLElement): RSTNode {
  const rootEl: PreactNode = container.firstChild as any;
  return rstNodeFromDOMElementOrComponent(rootEl);
}
