import type {
  AdapterOptions,
  MountRendererProps,
  RSTNode,
  ShallowRendererProps,
} from 'enzyme';
import enzyme from 'enzyme';
import type { ReactElement } from 'react';
import type { VNode } from 'preact';
import { h } from 'preact';

import MountRenderer from './MountRenderer.js';
import ShallowRenderer from './ShallowRenderer.js';
import StringRenderer from './StringRenderer.js';
import { rstNodeFromElement } from './preact10-rst.js';
import wrapWithWrappingComponent from './wrapWithWrappingComponent.js';
import RootFinder from './RootFinder.js';

export const { EnzymeAdapter } = enzyme;

export default class Adapter extends EnzymeAdapter {
  constructor() {
    super();

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

  createRenderer(options: AdapterOptions & MountRendererProps) {
    switch (options.mode) {
      case 'mount':
        // The `attachTo` option is only supported for DOM rendering, for
        // consistency with React, even though the Preact adapter could easily
        // support it for shallow rendering.
        return new MountRenderer({ ...options, container: options.attachTo });
      case 'shallow':
        return new ShallowRenderer();
      case 'string':
        return new StringRenderer();
      default:
        throw new Error(`"${options.mode}" rendering is not supported`);
    }
  }

  nodeToElement(node: RSTNode | string): ReactElement | string {
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

  createElement(
    type: string | Function,
    props: Object | null,
    ...children: ReactElement[]
  ) {
    return h(type as any, props, ...children);
  }

  elementToNode(el: ReactElement): RSTNode {
    return rstNodeFromElement(el as VNode) as RSTNode;
  }

  // This function is only called during shallow rendering
  wrapWithWrappingComponent = (
    node: ReactElement,
    /**
     * Tip:
     * The use of `wrappingComponent` and `wrappingComponentProps` is discouraged.
     * Using those props complicates a potential future migration to a different testing library.
     * Instead, wrap a component like this:
     * ```
     * shallow(<Wrapper><Component/></Wrapper>).dive()
     * ```
     */
    options?: ShallowRendererProps
  ) => {
    return {
      RootFinder: RootFinder,
      node: wrapWithWrappingComponent(this.createElement, node, options),
    };
  };
}
