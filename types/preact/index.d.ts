/**
 * Extensions to the Preact <= v9 typings that provide the interface used by
 * Preact 10.
 */

import { ComponentChildren, ComponentFactory, VNode } from 'preact';

declare module 'preact' {
  /**
   * Preact v8 vnodes.
   */
  export interface VNode<P = {}> {
		nodeName: ComponentFactory<P> | string;
		attributes: P;
		children: Array<VNode<any> | string>;
		key: Key | null;

    text?: string | number | null;
  }
}
