import { MountRenderer as AbstractMountRenderer, RSTNode } from 'enzyme';
import { VNode, h } from 'preact';

import { getNode as getNodeV8 } from './preact8-rst';
import { getNode as getNodeV10 } from './preact10-rst';
import { getDisplayName, isPreact10, withReplacedMethod } from './util';
import { render } from './compat';
import { getLastVNodeRenderedIntoContainer } from './preact10-internals';
import {
  installHook as installDebounceHook,
  flushRenders,
} from './debounce-render-hook';

type EventDetails = { [prop: string]: any };

export interface Options {
  /**
   * The container element to render into.
   * If not specified, a detached element (not connected to the body) is used.
   */
  container?: HTMLElement;
}

let testUtils: any;
if (isPreact10()) {
  // nb. We require the whole module here rather than just getting a reference
  // to the `act` function because `act` is patched in `debounce-render-hook`.
  testUtils = require('preact/test-utils');
}

/**
 * Invoke `callback` and then immediately flush any effects or pending renders
 * which were scheduled during the callback.
 */
function act(callback: () => any) {
  if (testUtils) {
    testUtils.act(callback);
  } else {
    callback();
  }
}

export default class MountRenderer implements AbstractMountRenderer {
  private _container: HTMLElement;
  private _getNode: typeof getNodeV10;

  constructor({ container }: Options = {}) {
    installDebounceHook();

    this._container = container || document.createElement('div');

    if (isPreact10()) {
      this._getNode = getNodeV10;
    } else {
      this._getNode = getNodeV8;
    }
  }

  render(el: VNode, context?: any, callback?: () => any) {
    act(() => {
      render(el, this._container);
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
      // Preact 8 requires DOM nodes to represent any rendered content.
      container.childNodes.length === 0 &&
      // If the root component rendered null in Preact 10 then the only
      // indicator that content has been rendered will be metadata attached to
      // the container.
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
    if (node.nodeType !== 'host') {
      const name = getDisplayName(node);
      throw new Error(
        `Cannot simulate event on "${name}" which is not a DOM element. ` +
          'Find a DOM element in the output and simulate an event on that.'
      );
    }

    // To be more faithful to a real browser, this should use the appropriate
    // constructor for the event type. This implementation is good enough for
    // many components though.
    const event = new Event(eventName, {
      bubbles: args.bubbles,
      composed: args.composed,
      cancelable: args.cancelable,
    });
    Object.assign(event, args);

    act(() => {
      node.instance.dispatchEvent(event);
    });
  }

  batchedUpdates(fn: () => {}) {
    fn();
  }

  container() {
    return this._container;
  }
}
