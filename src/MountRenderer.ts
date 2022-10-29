import type {
  MountRenderer as AbstractMountRenderer,
  MountRendererProps,
  RSTNode,
} from 'enzyme';
import type { VNode } from 'preact';
import { h, createElement } from 'preact';
import { act } from 'preact/test-utils';

import { render } from './compat.js';
import {
  installHook as installDebounceHook,
  flushRenders,
} from './debounce-render-hook.js';
import { eventMap } from './event-map.js';
import { getLastVNodeRenderedIntoContainer } from './preact10-internals.js';
import { getNode } from './preact10-rst.js';
import { getDisplayName, nodeToHostNode, withReplacedMethod } from './util.js';

type EventDetails = { [prop: string]: any };

export interface Options extends MountRendererProps {
  /**
   * The container element to render into.
   * If not specified, a detached element (not connected to the body) is used.
   */
  container?: HTMLElement;
}

function constructEvent(type: string, init: EventInit) {
  const meta = eventMap[type];
  const defaultInit = meta?.defaultInit ?? {};
  return new Event(type, {
    ...defaultInit,
    ...init,
  });
}

export default class MountRenderer implements AbstractMountRenderer {
  private _container: HTMLElement;
  private _getNode: typeof getNode;
  private _options: Options;

  constructor(options: Options = {}) {
    installDebounceHook();

    this._container = options.container || document.createElement('div');
    this._getNode = getNode;
    this._options = options;
  }

  render(el: VNode, context?: any, callback?: () => any) {
    act(() => {
      if (!this._options.wrappingComponent) {
        render(el, this._container);
        return;
      }

      // `this._options.wrappingComponent` is only available during mount-rendering,
      // even though ShallowRenderer uses an instance of MountRenderer under the hood.
      // For shallow-rendered components, we need to utilize `wrapWithWrappingComponent`.
      const wrappedComponent = createElement(
        this._options.wrappingComponent,
        this._options.wrappingComponentProps || null,
        el
      );
      render(wrappedComponent, this._container);
    });

    if (callback) {
      callback();
    }
  }

  unmount() {
    // A custom tag name is used here to work around
    // https://github.com/developit/preact/issues/1288.
    render(h('unmount-me', {}), this._container);
    this._container.innerHTML = '';
  }

  getNode() {
    flushRenders();

    const container = this._container;
    if (
      // If the root component rendered null then the only indicator that content
      // has been rendered will be metadata attached to the container.
      typeof getLastVNodeRenderedIntoContainer(container) === 'undefined'
    ) {
      return null;
    }

    return this._getNode(this._container);
  }

  simulateError(nodeHierarchy: RSTNode[], rootNode: RSTNode, error: any) {
    const errNode = nodeHierarchy[0];
    const render = () => {
      // Modify the stack to match where the error is thrown. This makes
      // debugging easier.
      error.stack = new Error().stack;
      throw error;
    };

    withReplacedMethod(errNode.instance, 'render', render, () => {
      act(() => {
        errNode.instance.forceUpdate();
      });
    });
  }

  simulateEvent(node: RSTNode, eventName: string, args: EventDetails = {}) {
    let hostNode: Node;
    if (node.nodeType == 'host') {
      hostNode = node.instance;
    } else {
      let possibleHostNode = nodeToHostNode(node);
      if (possibleHostNode == null) {
        const name = getDisplayName(node);
        throw new Error(
          `Cannot simulate event on "${name}" which is not a DOM element or contains no DOM element children. ` +
            'Find a DOM element or Component that contains a DOM element in the output and simulate an event on that.'
        );
      }

      hostNode = possibleHostNode;
    }

    // To be more faithful to a real browser, this should use the appropriate
    // constructor for the event type. This implementation is good enough for
    // many components though.
    const { bubbles, composed, cancelable, ...extra } = args;
    const init = {} as EventInit;
    if (typeof bubbles === 'boolean') {
      init.bubbles = bubbles;
    }
    if (typeof composed === 'boolean') {
      init.composed = composed;
    }
    if (typeof cancelable === 'boolean') {
      init.cancelable = cancelable;
    }
    const event = constructEvent(eventName, init);
    Object.assign(event, extra);

    act(() => {
      hostNode.dispatchEvent(event);
    });
  }

  batchedUpdates(fn: () => {}) {
    fn();
  }

  container() {
    return this._container;
  }

  wrapInvoke(callback: () => any) {
    let result;
    act(() => {
      result = callback();
    });
    return result;
  }

  getWrappingComponentRenderer() {
    return this;
  }
}
