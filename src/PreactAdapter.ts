import {
  AdapterOptions,
  ElementType,
  EnzymeAdapter,
  EnzymeRenderer,
  NodeType,
  JSXElement,
  RSTNode,
} from 'enzyme';

import MountRenderer from './MountRenderer';
import ShallowRenderer from './ShallowRenderer';
import StringRenderer from './StringRenderer';

import { h } from 'preact';

/**
 * Add `type` and  `props` properties to Preact's element class (`VNode`) as
 * aliases of `nodeName` and `attributes`.
 *
 * Preact <= 9 uses `nodeName` and `attributes` as the names for these properties
 * but Enzyme internally relies on being able to access this data via
 * the `type` and `props` attributes, eg. in its `cloneElement` function.
 */
function addTypeAndPropsToVNode() {
  const VNode = h('div', {}).constructor;
  if ('type' in VNode.prototype) {
    // Extra properties have already been added.
    return;
  }
  Object.defineProperty(VNode.prototype, 'type', {
    get() {
      return this.nodeName;
    },
  });
  Object.defineProperty(VNode.prototype, 'props', {
    get() {
      return this.attributes;
    },
  });
}

export default class PreactAdapter extends EnzymeAdapter {
  private options: Object;

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
    return h(node.type as any, node.props, childElements);
  }

  nodeToHostNode(node: RSTNode): Node | null {
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
    // See https://github.com/developit/preact/blob/master/src/vnode.js
    if (typeof el.nodeName !== 'string' && typeof el.nodeName !== 'function') {
      return false;
    }
    if (typeof el.children !== 'string' && !Array.isArray(el.children)) {
      return false;
    }
    return true;
  }

  createElement(type: ElementType, props: Object, ...children: JSXElement[]) {
    return h(type as any, props, ...children);
  }
}
