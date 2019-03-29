import {
  AdapterOptions,
  ElementType,
  EnzymeAdapter,
  JSXElement,
  RSTNode,
} from 'enzyme';
import { VNode, h } from 'preact';

import MountRenderer from './MountRenderer';
import ShallowRenderer from './ShallowRenderer';
import StringRenderer from './StringRenderer';
import { addTypeAndPropsToVNode } from './compat';
import { rstNodeFromElement } from './preact10-rst';

export default class Adapter extends EnzymeAdapter {
  constructor() {
    super();

    addTypeAndPropsToVNode();

    this.options = {
      // Prevent Enzyme's shallow renderer from manually invoking lifecycle
      // methods after a render. This manual invocation is needed for React
      // but not for the Preact adapter because we re-use the normal rendering
      // logic.
      lifecycles: {
        componentDidUpdate: {
          onSetState: false,
        },
      },
    };

    // Work around a bug in Enzyme where `ShallowWrapper.getElements` calls
    // the `nodeToElement` method with undefined `this`.
    this.nodeToElement = this.nodeToElement.bind(this);
  }

  createRenderer(options: AdapterOptions) {
    switch (options.mode) {
      case 'mount':
        return new MountRenderer();
      case 'shallow':
        return new ShallowRenderer();
      case 'string':
        return new StringRenderer();
      default:
        throw new Error(`"${options.mode}" rendering is not supported`);
    }
  }

  nodeToElement(node: RSTNode | string): JSXElement {
    if (typeof node === 'string') {
      return node;
    }
    const childElements = node.rendered.map(n => this.nodeToElement(n as any));
    return h(node.type as any, node.props, ...childElements);
  }

  nodeToHostNode(node: RSTNode | string): Node | null {
    if (typeof node === 'string') {
      // Returning `null` here causes `wrapper.text()` to return nothing for a
      // wrapper around a `Text` node. That's not intuitive perhaps, but it
      // matches the React adapters' behaviour.
      return null;
    }

    if (node.nodeType === 'host') {
      return node.instance;
    } else if (node.rendered.length > 0) {
      return this.nodeToHostNode(node.rendered[0] as RSTNode);
    } else {
      return null;
    }
  }

  isValidElement(el: any) {
    if (el == null) {
      return false;
    }
    if (
      typeof el.type !== 'string' &&
      typeof el.type !== 'function' &&
      el.type !== null
    ) {
      return false;
    }
    if (typeof el.props !== 'object' || el.props == null) {
      return false;
    }
    return true;
  }

  createElement(type: ElementType, props: Object, ...children: JSXElement[]) {
    return h(type as any, props, ...children);
  }

  elementToNode(el: JSXElement): RSTNode {
    return rstNodeFromElement(el as VNode) as RSTNode;
  }
}
