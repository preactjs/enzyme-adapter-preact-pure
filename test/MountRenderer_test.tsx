import { Component, h } from 'preact';
import { NodeType, RSTNode } from 'enzyme';
import { assert } from 'chai';
import * as sinon from 'sinon';

import MountRenderer from '../src/MountRenderer';

describe('MountRenderer', () => {
  describe('#render', () => {
    it('renders the element', () => {
      const renderer = new MountRenderer();
      renderer.render(<div>Hello</div>, {}, sinon.stub());

      const HTMLDivElement = (global as any).window.HTMLDivElement;
      assert.instanceOf(renderer.getNode()!.instance, HTMLDivElement);
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
      renderer.render(<Counter />, {});

      // Modify component state and check that the DOM has been updated
      // immediately. `setState` changes are normally applied asynchronously in
      // Preact.
      (renderer.getNode() as RSTNode).instance.increment();

      const container = renderer.getNode()!.instance.base!;
      assert.equal(container.innerHTML, '1');
    });
  });

  describe('#unmount', () => {
    it('removes the rendered DOM elements', () => {
      const renderer = new MountRenderer();
      renderer.render(<div>Hello</div>, {}, sinon.stub());
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
  });

  describe('#simulateEvent', () => {
    it('fires an event at the DOM node', () => {
      const renderer = new MountRenderer();
      const callback = sinon.stub();
      renderer.render(
        <button type="button" onClick={callback} />,
        {},
        sinon.stub()
      );

      renderer.simulateEvent(renderer.getNode() as RSTNode, 'click', {});

      sinon.assert.called(callback);
    });

    it('passes arguments to event handler', () => {
      const renderer = new MountRenderer();
      const callback = sinon.stub();
      renderer.render(
        <button type="button" onKeyDown={callback} />,
        {},
        sinon.stub()
      );

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
      renderer.render(<Button onClick={callback} />, {}, sinon.stub());

      assert.throws(() => {
        renderer.simulateEvent(renderer.getNode() as RSTNode, 'click', {});
      });
    });
  });
});
