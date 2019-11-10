import { ComponentFactory, VNode } from 'preact';
import 'enzyme';
import { ReactElement, ReactInstance } from 'react';

// Extensions to the Preact types for compatibility with the Enzyme types.
declare module 'preact' {
  // Extensions to the VNode type from Preact 10 to support compiling against
  // Preact 8.
  export interface VNode<P = {}> {
		nodeName: ComponentFactory<P> | string;
		attributes: P;
		children: Array<VNode<any> | string>;
		key: Key | null;

    text?: string | number | null;
  }

  // Extensions to the `Component` type to make the types of Preact vnodes
  // (returned by `h`) compatible with the `ReactElement` type referenced by
  // the Enzyme type definitions.
  export interface Component {
    refs: {
      [key: string]: ReactInstance;
    };
  }
}

// Extensions to the Enzyme types needed for writing an adapter.
declare module 'enzyme' {
  export type NodeType = 'function' | 'class' | 'host';

  /**
   * A "React Standard Tree" node.
   *
   * This is a standardized representation of the output of a tree rendered
   * by a React-like library.
   */
  export interface RSTNode {
    /** The kind of component that was rendered. */
    nodeType: NodeType;

    /** The host type (HTML element tag) or component constructor function. */
    type: string | Function;

    props: { [prop: string]: any };
    key: any;
    ref: any;
    instance: any;

    /** The result of the `render` function from this component. */
    rendered: Array<RSTNode | string | null>;
  }

  /**
   * A UI renderer created by an `EnzymeAdapter`
   */
  export interface Renderer {
    /** Remove the rendered output from the DOM. */
    unmount(): void;

    /**
     * Return a React Standard Tree (RST) representation of the output.
     */
    getNode(): RSTNode | null;

    simulateError(
      nodeHierarchy: RSTNode[],
      rootNode: RSTNode,
      error: any
    ): void;

    /** Simulate an event on a node in the output. */
    simulateEvent(node: RSTNode, event: string, args: Object): void;

    batchedUpdates(fn: () => {}): void;
  }

  /**
   * HTML renderer created by an adapter when `createRenderer` is called with
   * `{ mode: "string" }`
   */
  export interface StringRenderer extends Renderer {
    render(el: ReactElement, context?: any): void;
  }

  /**
   * Full DOM renderer created by an adapter when `createRenderer` is called
   * with `{ mode: "mount" }`
   */
  export interface MountRenderer extends Renderer {
    render(el: ReactElement, context?: any, callback?: () => any): void;
  }

  /**
   * Options passed to the `render` function of a shallow renderer.
   */
  export interface ShallowRenderOptions {
    /**
     * A map of context provider type, from the provider/consumer pair created
     * by React's `createContext` API, to current value.
     */
    providerValues: Map<Object, any>;
  }

  /**
   * Shallow renderer created by an adapter when `createRenderer` is called
   * with `{ mode: "shallow" }`
   */
  export interface ShallowRenderer extends Renderer {
    render(el: ReactElement, context?: any, options?: ShallowRenderOptions): void;
  }

  export interface AdapterOptions {
    mode: 'mount' | 'shallow' | 'string';

    /** DOM container to render into. */
    attachTo?: HTMLElement;
  }

  /**
   * An adapter that enables Enzyme to work with a specific React-like library.
   */
  export interface EnzymeAdapter {
    options: Object;

    // Required methods.
    createElement(
      type: string | Function,
      props: Object,
      ...children: ReactElement[]
    ): ReactElement;
    createRenderer(options: AdapterOptions): Renderer;
    elementToNode(element: ReactElement): RSTNode;
    isValidElement(el: ReactElement): boolean;
    nodeToElement(node: RSTNode): ReactElement | string;
    nodeToHostNode(node: RSTNode): Node | null;

    // Optional methods.
    displayNameOfNode?(node: RSTNode): string;
    invokeSetStateCallback?(instance: any, callback: () => {}): void;
    isCustomComponentElement?(instance: RSTNode): boolean;
    isFragment?(node: RSTNode): boolean;
    isValidElementType?(obj: any): boolean;
    wrap?(element: ReactElement): ReactElement;
  }
}
