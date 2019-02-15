import { EnzymeRenderer, JSXElement, RSTNode } from 'enzyme';
import { h, render } from 'preact';

import { PreactNode } from './preact-internals';
import { getDisplayName, rstNodeFromDOMElementOrComponent } from './rst-node';

type EventDetails = { [prop: string]: any };

export default class MountRenderer implements EnzymeRenderer {
  private _container: HTMLElement;
  private _rootNode: PreactNode | undefined;

  constructor() {
    this._container = document.createElement('div');
  }

  render(el: JSXElement, context: any, callback?: () => any) {
    this._rootNode = render(el, this._container, this._rootNode as any) as any;

    // Monkey-patch the component's `setState` to make it force an update after
    // rendering.
    const instance = (this.getNode() as RSTNode).instance;
    const originalSetState = instance.setState;
    instance.setState = function(...args: any[]) {
      originalSetState.call(this, ...args);
      this.forceUpdate();
    };

    if (callback) {
      callback();
    }
  }

  unmount() {
    if (this._rootNode) {
      // A custom tag name is used here to work around
      // https://github.com/developit/preact/issues/1288.
      this._rootNode = render(h('unmount-me', {}), this._container, this
        ._rootNode as any) as any;
      if (this._rootNode) {
        this._rootNode.remove();
      }
    }
  }

  getNode() {
    if (!this._rootNode) {
      return null;
    }
    return rstNodeFromDOMElementOrComponent(this._rootNode);
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

  rootNode() {
    return this._rootNode;
  }
}
