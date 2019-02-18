import { EnzymeRenderer, RSTNode } from 'enzyme';
import { VNode, h } from 'preact';

import { getDisplayName, getNode as getNodeClassic } from './preact-rst';
import { getNode as getNodeV10 } from './preact10-rst';
import { isPreact10 } from './util';
import { render } from './compat';

type EventDetails = { [prop: string]: any };

export default class MountRenderer implements EnzymeRenderer {
  private _container: HTMLElement;
  private _getNode: typeof getNodeClassic;

  constructor() {
    this._container = document.createElement('div');

    if (isPreact10()) {
      this._getNode = getNodeV10;
    } else {
      this._getNode = getNodeClassic;
    }
  }

  render(el: VNode, context: any, callback?: () => any) {
    render(el, this._container);
    const rootNode = this._getNode(this._container);

    // Monkey-patch the component's `setState` to make it force an update after
    // rendering.
    const instance = rootNode.instance;
    if (instance.setState) {
      const originalSetState = instance.setState;
      instance.setState = function(...args: any[]) {
        originalSetState.call(this, ...args);
        this.forceUpdate();
      };
    }

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
    if (this._container.childNodes.length === 0) {
      return null;
    }
    return this._getNode(this._container);
  }

  simulateError(node: RSTNode, rootNode: RSTNode, error: any) {
    // TODO
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
    node.instance.dispatchEvent(event);
  }

  batchedUpdates(fn: () => {}) {
    fn();
  }

  container() {
    return this._container;
  }
}
