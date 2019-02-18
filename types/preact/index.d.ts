/**
 * Extensions to the Preact <= v9 typings that provide the interface used by
 * Preact 10.
 */

import { ComponentChildren, ComponentFactory, VNode } from 'preact';

declare module 'preact' {
  /**
   * Preact v10 vnodes.
   */
  export interface VNode<P = any> {
    type: ComponentFactory<P>|string|null;
    text?: string|number|null;
    ref?: Ref<any>;
    props: P & { children: ComponentChildren };
  }
}
