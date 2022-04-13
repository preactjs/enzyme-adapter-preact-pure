import type { ComponentChildren, VNode } from 'preact';

/**
 * Helper for the `wrappingComponent` option for shallow rendering which is
 * used to locate the wrapped content in the output of a wrapper component.
 */
export default function RootFinder({
  children,
}: {
  children: ComponentChildren;
}) {
  return children as VNode;
}
