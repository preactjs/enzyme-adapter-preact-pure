import type {
  ShallowRenderer as AbstractShallowRenderer,
  RSTNode,
  ShallowRenderOptions,
} from 'enzyme';
import type { VNode } from 'preact';
import { isValidElement } from 'preact';

import type { EventDetails } from './MountRenderer.js';
import { propFromEvent } from './util.js';
import PreactShallowDiff from './compat-shallow-renderer/PreactShallowRenderer.js';
import { flushRenders } from './debounce-render-hook.js';
import { nodeTypeFromType, rstNodeFromElement } from './preact10-rst.js';

/**
 * A shallow renderer that natively shallow renders Preact components by not
 * relying on a document and overriding children to return null. It relies on a
 * copy of Preact's diff algorithm, modified to not descend and diff children of
 * the given element.
 */
export default class CompatShallowRenderer implements AbstractShallowRenderer {
  private _renderer: PreactShallowDiff;
  private _cachedNode: VNode<any> | null;

  constructor() {
    this._renderer = PreactShallowDiff.createRenderer();
    this._cachedNode = null;
  }

  render(el: VNode, context?: any, options?: ShallowRenderOptions) {
    this._cachedNode = el;
    if (typeof el.type !== 'string') {
      return this._renderer.render(el, context);
    }
  }

  simulateError(nodeHierarchy: RSTNode[], rootNode: RSTNode, error: any) {
    const instance = this._renderer.getMountedInstance();
    const catchingType = this._cachedNode?.type;

    const componentDidCatch = instance?.componentDidCatch;
    const getDerivedStateFromError = (instance as any)
      ?.getDerivedStateFromError;
    if (
      !instance ||
      !catchingType ||
      (!componentDidCatch && !getDerivedStateFromError)
    ) {
      throw error;
    }

    if (getDerivedStateFromError) {
      const stateUpdate = getDerivedStateFromError.call(catchingType, error);
      instance.setState(stateUpdate);
    }
    if (componentDidCatch) {
      componentDidCatch.call(instance, error, {
        componentStack: 'Test component stack',
      });
    }
  }

  simulateEvent(node: RSTNode, eventName: string, args: EventDetails) {
    const handler = node.props[propFromEvent(eventName)];
    if (handler) {
      handler(args);
    }
  }

  unmount() {
    this._renderer.unmount();
  }

  getNode() {
    if (this._cachedNode == null || !isValidElement(this._cachedNode)) {
      return null;
    }

    flushRenders();

    // The output of DOM elements is props.children whereas for components its
    // from the renderer
    const output =
      typeof this._cachedNode.type === 'string'
        ? this._cachedNode.props.children
        : this._renderer.getRenderOutput();

    return {
      nodeType: nodeTypeFromType(this._cachedNode.type),
      type: this._cachedNode.type,
      props: this._cachedNode.props,
      key: this._cachedNode.key ?? undefined,
      ref: this._cachedNode.ref,
      instance: this._renderer.getMountedInstance(),
      rendered: Array.isArray(output)
        ? output.flat().map(el => rstNodeFromElement(el))
        : [rstNodeFromElement(output)],
    };
  }

  batchedUpdates(fn: () => any) {
    fn();
  }
}
