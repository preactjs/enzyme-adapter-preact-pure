import type { ReactElement } from 'react';
import type { EnzymeAdapter, ShallowRendererProps } from 'enzyme';
import RootFinder from './RootFinder.js';
import { childElements } from './compat.js';

/** Based on the equivalent function in `enzyme-adapter-utils` */
export default function wrapWithWrappingComponent(
  createElement: EnzymeAdapter['createElement'],
  node: ReactElement,
  options: ShallowRendererProps = {}
) {
  const { wrappingComponent, wrappingComponentProps = {} } = options;

  if (!wrappingComponent) {
    return node;
  }

  let nodeWithValidChildren = node;

  if (typeof nodeWithValidChildren.props.children === 'string') {
    // This prevents an error when `.dive()` is used:
    // `TypeError: ShallowWrapper::dive() can only be called on components`
    nodeWithValidChildren = Object.assign({}, nodeWithValidChildren);
    nodeWithValidChildren.props.children = childElements(nodeWithValidChildren);
  }

  return createElement(
    wrappingComponent,
    wrappingComponentProps,
    createElement(RootFinder, null, nodeWithValidChildren)
  );
}
