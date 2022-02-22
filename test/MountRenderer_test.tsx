import { assert } from 'chai';
import { RSTNode } from 'enzyme';
import { Component } from 'preact';
import * as preact from 'preact';
import { useEffect, useLayoutEffect, useState } from 'preact/hooks';
import sinon from 'sinon';

import MountRenderer from '../src/MountRenderer.js';

describe('MountRenderer', () => {
  describe('#render', () => {
    it('renders the element', () => {
      const renderer = new MountRenderer();
      renderer.render(<div>Hello</div>);

      const HTMLDivElement = (global as any).window.HTMLDivElement;
      assert.instanceOf(renderer.getNode()!.instance, HTMLDivElement);
    });

    it('renders the element into the provided container', () => {
      const container = document.createElement('div');
      const renderer = new MountRenderer({ container });
      renderer.render(<button />);
      assert.ok(container.querySelector('button'));
    });

    it('invokes the post-render callback', () => {
      const renderer = new MountRenderer();
      const callback = sinon.stub();
      renderer.render(<div>Hello</div>, {}, callback);
      sinon.assert.called(callback);
    });

    it('executes effect hooks on initial render', () => {
      let effectCount = 0;
      let layoutEffectCount = 0;

      function TestComponent() {
        useLayoutEffect(() => {
          ++layoutEffectCount;
        });
        useEffect(() => {
          ++effectCount;
        });
        return null;
      }

      const renderer = new MountRenderer();
      renderer.render(<TestComponent />);

      assert.equal(layoutEffectCount, 1);
      assert.equal(effectCount, 1);
    });

    it('executes hook cleanup on unmount', () => {
      let effectRemoved = false;

      function TestComponent() {
        useEffect(() => {
          return () => (effectRemoved = true);
        });
        return null;
      }

      const renderer = new MountRenderer();
      renderer.render(<TestComponent />);

      assert.equal(effectRemoved, false);
      renderer.unmount();
      assert.equal(effectRemoved, true);
    });

    it('flushes hooks and state updates after a simulated event', () => {
      let clicked = false;
      let effectCount = 0;

      function TestComponent() {
        const [clicked_, setClicked] = useState(false);
        useEffect(() => {
          ++effectCount;
          clicked = clicked_;
        });
        return <div onClick={() => setClicked(true)} />;
      }

      const renderer = new MountRenderer();
      renderer.render(<TestComponent />);

      effectCount = 0;
      const divNode = renderer.getNode()!.rendered[0] as RSTNode;
      renderer.simulateEvent(divNode, 'click');

      assert.equal(effectCount, 1);
      assert.equal(clicked, true);
    });
  });

  describe('#unmount', () => {
    it('removes the rendered DOM elements', () => {
      const renderer = new MountRenderer();
      renderer.render(<div>Hello</div>);
      const container = renderer.container();
      assert.equal(container.childNodes.length, 1);
      renderer.unmount();
      assert.equal(container.childNodes.length, 0);
    });

    it('runs effect cleanup callbacks', () => {
      let unmountCount = 0;

      function Widget() {
        useEffect(() => {
          return () => {
            unmountCount += 1;
          };
        });
        return <div>Test</div>;
      }

      const renderer = new MountRenderer();
      renderer.render(<Widget />);
      renderer.unmount();

      assert.equal(unmountCount, 1);
    });
  });

  describe('#getNode', () => {
    it('returns `null` if instance not rendered', () => {
      const renderer = new MountRenderer();
      assert.equal(renderer.getNode(), null);
    });

    it('does not return null if root component rendered `null`', () => {
      const Component = () => null;
      const renderer = new MountRenderer();
      renderer.render(<Component />);
      assert.notEqual(renderer.getNode(), null);
    });

    it('flushes any pending renders enqueued by `setState`', () => {
      class Counter extends Component<any, any> {
        constructor(props: any) {
          super(props);
          this.state = { count: 0 };
        }

        increment() {
          this.setState((state: any) => ({ count: this.state.count + 1 }));
        }

        render() {
          return <div>{this.state.count}</div>;
        }
      }
      const renderer = new MountRenderer();

      // Perform an initial render.
      renderer.render(<Counter />);
      let container = renderer.getNode()!.instance.base!;
      assert.equal(container.innerHTML, '0');

      // Trigger a state change. This will not update the DOM immediately
      // because `setState` calls are asynchronous in Preact.
      (renderer.getNode() as RSTNode).instance.increment();
      assert.equal(container.innerHTML, '0');

      // Invoke `renderer.getNode()`, which should flush any pending re-renders.
      // Enzyme calls `getNode()` whenever `wrapper.update()` is called
      // explicitly or whenever performing an action which is likely to result
      // in updates (eg. `simulate`).
      renderer.getNode();
      assert.equal(container.innerHTML, '1');
    });
  });

  describe('#simulateEvent', () => {
    it('fires an event at the DOM node', () => {
      const renderer = new MountRenderer();
      const callback = sinon.stub();
      renderer.render(<button type="button" onClick={callback} />);

      renderer.simulateEvent(renderer.getNode() as RSTNode, 'click', {});

      sinon.assert.called(callback);
    });

    [
      {
        type: 'click',
        bubbles: true,
        cancelable: true,
      },
      {
        type: 'focus',
        bubbles: false,
        cancelable: false,
      },
      {
        type: 'animationstart',
        bubbles: true,
        cancelable: false,
      },
      {
        type: 'somecustomevent',
        bubbles: false,
        cancelable: false,
      },
    ].forEach(({ type, bubbles, cancelable }) => {
      it('sets default event properties based on event type', () => {
        const renderer = new MountRenderer();
        const callback = sinon.stub();
        const eventProp = 'on' + type;
        const props = { [eventProp]: callback };
        renderer.render(<button type="button" {...props} />);

        renderer.simulateEvent(renderer.getNode() as RSTNode, type, {});

        sinon.assert.calledOnce(callback);
        const event = callback.getCall(0).args[0];
        assert.equal(event.bubbles, bubbles);
        assert.equal(event.cancelable, cancelable);
      });
    });

    it('passes arguments to event handler', () => {
      const renderer = new MountRenderer();
      const callback = sinon.stub();
      renderer.render(<button type="button" onKeyDown={callback} />);

      renderer.simulateEvent(renderer.getNode() as RSTNode, 'keydown', {
        key: 'a',
      });

      sinon.assert.calledWithMatch(callback, {
        key: 'a',
      });
    });

    it('throws if target is not a DOM node', () => {
      function Button({ onClick }: any) {
        return <button type="button" onClick={onClick} />;
      }
      const renderer = new MountRenderer();
      const callback = sinon.stub();
      renderer.render(<Button onClick={callback} />);

      assert.throws(() => {
        renderer.simulateEvent(renderer.getNode() as RSTNode, 'click', {});
      });
    });
  });

  describe('#wrapInvoke', () => {
    it('returns result of callback', () => {
      const Widget = () => <div />;
      const renderer = new MountRenderer();
      renderer.render(<Widget />);

      const result = renderer.wrapInvoke(() => 'test');

      assert.equal(result, 'test');
    });
  });

  describe('getNode', () => {
    it('can get the node', () => {
      const renderedTree = [
        {
          nodeType: 'host',
          type: 'div',
          props: {},
          key: null,
          ref: null,
          instance: document.createElement('span'),
          rendered: [],
        },
      ];

      const Widget = () => <span />;
      const renderer = new MountRenderer();
      renderer.render(<Widget />);

      const result = renderer.getWrappingComponentRenderer();

      assert.equal(result.getNode()?.rendered.length, 1);

      const resultInstance = (result.getNode()?.rendered[0] as RSTNode)
        .instance;
      const expectedInstance = renderedTree[0].instance;

      assert.equal(resultInstance.outerHTML, expectedInstance.outerHTML);
    });
  });
});
