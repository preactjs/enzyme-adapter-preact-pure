/**
 * This module declares the types needed to implement adapters for Enzyme.
 *
 * Types for the consumer-facing API of Enzyme are available from DefinitelyTyped.
 */

declare module 'enzyme' {
  /**
   * The component class/function or host node type (eg. "div" for DOM `<div>`)
   * of an element.
   */
  export type ElementType = string | Function;

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
    type: ElementType;

    props: { [prop: string]: any };
    key: any;
    ref: any;
    instance: any;

    /** The result of the `render` function from this component. */
    rendered: Array<RSTNode|string|null>;
  }

  /**
   * A UI renderer created by an `EnzymeAdapter`
   */
  export interface EnzymeRenderer {
    render(el: JSXElement, context: any, callback: () => any): void;

    /** Remove the rendered output from the DOM. */
    unmount(): void;

    /**
     * Return a React Standard Tree (RST) representation of the output.
     */
    getNode(): RSTNode|null;

    simulateError(nodeHierarchy: RSTNode[], rootNode: RSTNode, error: any): void;

    /** Simulate an event on a node in the output. */
    simulateEvent(node: RSTNode, event: string, args: Object): void;

    batchedUpdates(fn: () => {}): void;
  }

  export interface AdapterOptions {
    mode: 'mount' | 'shallow' | 'string';
  }

  /**
   * An element created by the `createElement` function of the React-like library.
   *
   * The internals of this will vary depending on the library.
   */
  export type JSXElement = Object;

  /**
   * An adapter that enables Enzyme to work with a specific React-like library.
   */
  export class EnzymeAdapter {
    options: Object;

    createRenderer(options: AdapterOptions): EnzymeRenderer;
    nodeToElement(node: RSTNode): JSXElement;
    isValidElement(el: JSXElement): boolean;
    createElement(type: ElementType, props: Object, ...children: JSXElement[]): JSXElement;
    invokeSetStateCallback(instance: any, callback: () => {}): void;
  }

  // TODO
  export var mount: any;
  export var render: any;
  export var shallow: any;
  export var configure: any;
}
