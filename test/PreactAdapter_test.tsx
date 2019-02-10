import { h } from 'preact';
import { assert } from 'chai';
import { RSTNode } from 'enzyme';

import PreactAdapter from '../src/PreactAdapter';
import MountRenderer from '../src/MountRenderer';
import ShallowRenderer from '../src/ShallowRenderer';
import StringRenderer from '../src/StringRenderer';

describe('PreactAdapter', () => {
  it('adds `type` and `props` attributes to VNodes', () => {
    // Add extra properties to vnodes for compatibility with Enzyme.
    const adapter = new PreactAdapter();
    const el = h('img', { alt: 'A test image' }) as any;
    assert.equal(el.type, 'img');
    assert.deepEqual(el.props, {
      alt: 'A test image',
    });
  });

  describe('#createElement', () => {
    it('returns a VNode', () => {
      const adapter = new PreactAdapter();
      const el = adapter.createElement(
        'div',
        { title: 'foo' },
        adapter.createElement('img', { alt: 'bar' })
      );
      assert.deepEqual(
        el,
        <div title="foo">
          <img alt="bar" />
        </div>
      );
    });
  });

  describe('#isValidElement', () => {
    function Component({ prop }: { prop?: string }) {
      return <div>Test</div>;
    }

    [
      <Component />,
      <Component prop="val" />,
      <div>Test</div>,
      <button type="button">Click me</button>,
    ].forEach(el => {
      it('returns true if element is a valid VNode', () => {
        const adapter = new PreactAdapter();
        assert.equal(adapter.isValidElement(el), true);
      });
    });

    ['not-a-vnode', null].forEach(el => {
      it('returns false if element is not a valid VNode', () => {
        const adapter = new PreactAdapter();
        assert.equal(adapter.isValidElement(el), false);
      });
    });
  });

  describe('#nodeToElement', () => {
    it('returns a JSX element', () => {
      const renderer = new MountRenderer();
      const el = <button type="button">Click me</button>;
      renderer.render(el, {});
      const adapter = new PreactAdapter();
      const rstNode = renderer.getNode() as RSTNode;
      assert.deepEqual(adapter.nodeToElement(rstNode), el);
    });
  });

  describe('#nodeToHostNode', () => {
    it('returns DOM node if RSTNode is a "host" node', () => {
      const renderer = new MountRenderer();
      renderer.render(<button type="button">Click me</button>, {});
      const adapter = new PreactAdapter();
      const hostNode = adapter.nodeToHostNode(renderer.getNode() as RSTNode);
      assert.ok(hostNode);
      assert.equal((hostNode as Node).constructor.name, 'HTMLButtonElement');
    });

    it('returns DOM node if RSTNode is not a "host" node', () => {
      function Button() {
        return <button>Click me</button>;
      }
      const renderer = new MountRenderer();
      renderer.render(<Button />, {});
      const adapter = new PreactAdapter();
      const hostNode = adapter.nodeToHostNode(renderer.getNode() as RSTNode);
      assert.ok(hostNode);
      assert.equal((hostNode as Node).constructor.name, 'HTMLButtonElement');
    });
  });

  describe('#createRenderer', () => {
    it('returns a `MountRenderer` when the mode is "mount"', () => {
      const adapter = new PreactAdapter();
      const renderer = adapter.createRenderer({ mode: 'mount' });
      assert.instanceOf(renderer, MountRenderer);
    });

    it('returns a `ShallowRenderer` when the mode is "mount"', () => {
      const adapter = new PreactAdapter();
      const renderer = adapter.createRenderer({ mode: 'shallow' });
      assert.instanceOf(renderer, ShallowRenderer);
    });

    it('returns a `StringRenderer` when the mode is "string"', () => {
      const adapter = new PreactAdapter();
      const renderer = adapter.createRenderer({ mode: 'string' });
      assert.instanceOf(renderer, StringRenderer);
    });

    it('throws if mode is unsupported', () => {
      const modes = ['unknown'];
      const adapter = new PreactAdapter();
      modes.forEach(mode => {
        assert.throws(() => adapter.createRenderer({ mode } as any));
      });
    });
  });
});
