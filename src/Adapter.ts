import type {
  AdapterOptions,
  MountRendererProps,
  RSTNode,
  RSTNodeChild,
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
import { isRSTNode, nodeToHostNode } from './util.js';
import CompatShallowRenderer from './CompatShallowRenderer.js';

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
   * An option to provide a custom string renderer for Enzyme's `string` rendering mode
   * instead of mounting into a DOM and extracting the markup. It is expected
   * that preact-render-to-string is passed here.
   */
  renderToString?: (el: VNode<any>, context: any) => string;

  /**
   * Enable a new shallow renderer that more closely matches the behavior and
   * mechanics of React's shallow renderer, but uses Preact.
   *
   * The previous shallow renderer rendered components into a DOM and modified
   * it's output so that all children return null to prevent rendering further
   * down the tree. The new shallow renderer is a custom implementation of
   * Preact's diffing algorithm that only shallow renders the given component
   * and does not recurse down the VDOM tree. It's behavior more closely matches
   * the React 16 enzyme adapter and it well suited for migrating an enzyme test
   * suite from React to Preact.
   */
  useCompatShallowRendering?: boolean;
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

    if (this.preactAdapterOptions.useCompatShallowRendering) {
      this.isFragment = node => node?.type === Fragment;

      this.displayNameOfNode = (node: RSTNode | null): string | null => {
        if (!node) return null;
        if (!node.type) return null;

        if (this.isFragment?.(node)) {
          return 'Fragment';
        }

        return typeof node.type === 'function'
          ? (node.type as any).displayName || node.type.name || 'Component'
          : node.type;
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
        if (this.preactAdapterOptions.useCompatShallowRendering) {
          return new CompatShallowRenderer();
        } else {
          return new ShallowRenderer({ ...this.preactAdapterOptions });
        }
      case 'string':
        return new StringRenderer({ ...this.preactAdapterOptions });
      default:
        throw new Error(`"${options.mode}" rendering is not supported`);
    }
  }

  nodeToElement(node: RSTNodeChild): ReactElement | string {
    if (!isRSTNode(node)) {
      return node as any;
    }

    const props: any = { ...node.props };
    if (node.key) {
      props.key = node.key;
    }
    if (node.ref) {
      props.ref = node.ref;
    }

    const childElements = node.rendered.map(n => this.nodeToElement(n));
    return h(node.type as any, props, ...childElements) as ReactElement;
  }

  nodeToHostNode(node: RSTNodeChild): Node | null {
    return nodeToHostNode(node);
  }

  isValidElement(el: any) {
    if (el == null || typeof el !== 'object') {
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
    return rstNodeFromElement(
      el as VNode,
      this.preactAdapterOptions.useCompatShallowRendering ?? false
    ) as RSTNode;
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
