import { Component, h } from 'preact';
import { RSTNode } from 'enzyme';
import { assert } from 'chai';
import * as sinon from 'sinon';

import MountRenderer from '../src/MountRenderer';
import { isPreact10 } from '../src/util';

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

    it('makes `setState` trigger an immediate update', () => {
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
      renderer.render(<Counter />);

      // Modify component state and check that the DOM has been updated
      // immediately. `setState` changes are normally applied asynchronously in
      // Preact.
      (renderer.getNode() as RSTNode).instance.increment();

      const container = renderer.getNode()!.instance.base!;
      assert.equal(container.innerHTML, '1');
    });

    if (isPreact10()) {
      const { useEffect, useLayoutEffect } = require('preact/hooks');

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
    }
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
  });

  describe('#simulateEvent', () => {
    it('fires an event at the DOM node', () => {
      const renderer = new MountRenderer();
      const callback = sinon.stub();
      renderer.render(<button type="button" onClick={callback} />);

      renderer.simulateEvent(renderer.getNode() as RSTNode, 'click', {});

      sinon.assert.called(callback);
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
});
