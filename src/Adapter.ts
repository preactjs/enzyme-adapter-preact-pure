import type {
  AdapterOptions,
  MountRendererProps,
  RSTNode,
  ShallowRendererProps,
} from 'enzyme';
import enzyme from 'enzyme';
import type { ReactElement } from 'react';
import type { VNode } from 'preact';
import { Fragment, cloneElement, h } from 'preact';

import MountRenderer from './MountRenderer.js';
import ShallowRenderer from './ShallowRenderer.js';
import StringRenderer from './StringRenderer.js';
import { childElements } from './compat.js';
import { rstNodeFromElement } from './preact10-rst.js';
import RootFinder from './RootFinder.js';
import { nodeToHostNode } from './util.js';

export const { EnzymeAdapter } = enzyme;

export interface PreactAdapterOptions {
  /**
   * Turn on behavior that enables calling `.simulateEvent` directly on
   * Components. For shallow rendering, this directly calls the component's
   * corresponding prop. For mount rendering, it finds the first DOM node in the
   * Component, and dispatches the event from it. This behavior matches the
   * behavior of the React 16 enzyme adapter.
   */
  simulateEventsOnComponents?: boolean;

  /**
   * The handling of fragments differs between full and shallow rendering in the
   * React adapters. In "mount"/full renders fragments do not appear in the RST
   * tree. In shallow renders they do.
   *
   * In preactjs/enzyme-adapter-preact-pure#2, the decision was made to have
   * this adapter's shallow and mount renderers omit and skip over Fragments.
   * This option changes that behavior to match the React adapter's behavior and
   * preserve Fragments in shallow rendering.
   */
  preserveFragmentsInShallowRender?: boolean;
}

export default class Adapter extends EnzymeAdapter {
  private preactAdapterOptions: PreactAdapterOptions;

  constructor(preactAdapterOptions: PreactAdapterOptions = {}) {
    super();

    this.preactAdapterOptions = preactAdapterOptions;
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

    if (preactAdapterOptions.preserveFragmentsInShallowRender) {
      // Implement isFragment when flag is on to better match React 16 adapter.
      // The isFragment method is used by enzyme to skip over Fragments in some
      // methods such as `children()` and `debug()`.
      this.isFragment = (node: RSTNode): boolean => {
        return (
          (node?.type as any)?.originalType === Fragment ||
          node?.type === Fragment
        );
      };
    }
  }

  createRenderer(options: AdapterOptions & MountRendererProps) {
    switch (options.mode) {
      case 'mount':
        // The `attachTo` option is only supported for DOM rendering, for
        // consistency with React, even though the Preact adapter could easily
        // support it for shallow rendering.
        return new MountRenderer({
          ...options,
          ...this.preactAdapterOptions,
          container: options.attachTo,
        });
      case 'shallow':
        return new ShallowRenderer({ ...this.preactAdapterOptions });
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
    return h(node.type as any, node.props, ...childElements) as ReactElement;
  }

  nodeToHostNode(node: RSTNode | string): Node | null {
    return nodeToHostNode(node);
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
  ): ReactElement {
    return h(type as any, props, ...children) as ReactElement;
  }

  elementToNode(el: ReactElement): RSTNode {
    return rstNodeFromElement(el as VNode) as RSTNode;
  }

  // This function is only called during shallow rendering
  wrapWithWrappingComponent = (
    el: ReactElement,
    /**
     * Tip:
     * The use of `wrappingComponent` and `wrappingComponentProps` is discouraged.
     * Using those props complicates a potential future migration to a different testing library.
     * Instead, wrap a component like this:
     * ```
     * shallow(<Wrapper><Component/></Wrapper>).dive()
     * ```
     */
    options: ShallowRendererProps = {}
  ) => {
    const { wrappingComponent, wrappingComponentProps = {} } = options;

    if (!wrappingComponent) {
      return { RootFinder, node: el };
    }

    let elementWithValidChildren;
    if (typeof el.props.children === 'string') {
      // This prevents an error when `.dive()` is used:
      // `TypeError: ShallowWrapper::dive() can only be called on components`.
      // ---------------------------------------------------------------------
      // VNode before: `{ type: Widget, props: { children: 'test' }, ... }`
      // VNode after:  `{ type: Widget, props: { children: ['test'] }, ... }`
      elementWithValidChildren = cloneElement(el, el.props, childElements(el));
    } else {
      elementWithValidChildren = el;
    }

    const wrappedElement = h(
      wrappingComponent,
      wrappingComponentProps,
      h(RootFinder, null, elementWithValidChildren)
    );

    return {
      RootFinder,
      node: wrappedElement as ReactElement,
    };
  };
}
