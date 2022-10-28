import type { VNode } from 'preact';
import * as preact from 'preact';
import { assert } from 'chai';
import type { RSTNode } from 'enzyme';

import Adapter from '../src/Adapter.js';
import MountRenderer from '../src/MountRenderer.js';
import ShallowRenderer from '../src/ShallowRenderer.js';
import StringRenderer from '../src/StringRenderer.js';

/**
 * Return a deep copy of a vnode, omitting internal fields that have a `__`
 * prefix.
 *
 * Stripping private fields is useful when comparing vnodes because the private
 * fields may differ even if the VNodes are logically the same value. For example
 * in some Preact versions VNodes include an ID counter field.
 */
function stripInternalVNodeFields(obj: object) {
  const result = {} as Record<string, any>;
  for (let [key, value] of Object.entries(obj)) {
    if (!key.startsWith('__')) {
      if (typeof value === 'object' && value !== null) {
        result[key] = stripInternalVNodeFields(value);
      } else {
        result[key] = value;
      }
    }
  }
  return result;
}

describe('Adapter', () => {
  it('adds `type` and `props` attributes to VNodes', () => {
    // Add extra properties to vnodes for compatibility with Enzyme.
    new Adapter();
    const el = preact.h('img', { alt: 'A test image' }) as any;
    assert.equal(el.type, 'img');
    assert.deepEqual(el.props, {
      alt: 'A test image',
    });
  });

  describe('#createElement', () => {
    it('returns a VNode', () => {
      const adapter = new Adapter();
      const el = adapter.createElement(
        'div',
        { title: 'foo' },
        adapter.createElement('img', { alt: 'bar' })
      );
      assert.deepEqual(
        stripInternalVNodeFields(el),
        stripInternalVNodeFields(
          <div title="foo">
            <img alt="bar" />
          </div>
        )
      );
    });
  });

  describe('#isValidElement', () => {
    function Component({ prop }: { prop?: string }) {
      return <div>Test</div>;
    }

    [
      {
        description: 'Component without props',
        el: <Component />,
      },
      {
        description: 'Component with props',
        el: <Component prop="val" />,
      },
      {
        description: 'DOM element without props',
        el: <div>Test</div>,
      },
      {
        description: 'DOM element with props',
        el: <button type="button">Click me</button>,
      },
    ].forEach(({ description, el }) => {
      it(`returns true if element is a valid VNode (${description})`, () => {
        const adapter = new Adapter();
        assert.equal(adapter.isValidElement(el), true);
      });
    });

    ['not-a-vnode', null].forEach(el => {
      it('returns false if element is not a valid VNode', () => {
        const adapter = new Adapter();
        assert.equal(adapter.isValidElement(el), false);
      });
    });
  });

  describe('#nodeToElement', () => {
    function stripPrivateKeys<T>(obj: T) {
      const result: any = { ...obj };
      Object.keys(result).forEach(key => {
        if (key.startsWith('_')) {
          delete result[key];
        }
      });
      return result;
    }

    function TextComponent() {
      return 'test' as unknown as VNode<any>;
    }

    function Child() {
      return <span>child</span>;
    }

    function Parent() {
      return (
        <div>
          <Child />
        </div>
      );
    }

    [
      {
        // Simple DOM element.
        el: <button type="button">Click me</button>,
      },
      {
        // DOM elements with keys.
        el: (
          <ul>
            <li key={1}>Test</li>
            <li key={2}>Test</li>
          </ul>
        ),
      },
      {
        // DOM element with ref.
        el: <div ref={() => {}} />,
      },
      {
        // Component that renders text.
        el: <TextComponent />,
      },
      {
        // Component with children.
        el: <Parent />,
      },
    ].forEach(({ el }) => {
      it('returns JSX element that matches original input', () => {
        const renderer = new MountRenderer();
        const el = <button type="button">Click me</button>;
        renderer.render(el);
        const adapter = new Adapter();
        const rstNode = renderer.getNode() as RSTNode;
        assert.deepEqual(
          stripPrivateKeys(adapter.nodeToElement(rstNode)),
          stripPrivateKeys(el)
        );
      });
    });
  });

  describe('#nodeToHostNode', () => {
    it('returns DOM node if RSTNode is a "host" node', () => {
      const renderer = new MountRenderer();
      renderer.render(<button type="button">Click me</button>);
      const adapter = new Adapter();
      const hostNode = adapter.nodeToHostNode(renderer.getNode() as RSTNode);
      assert.ok(hostNode);
      assert.equal((hostNode as Node).constructor.name, 'HTMLButtonElement');
    });

    it('returns DOM node if RSTNode is not a "host" node', () => {
      function Button() {
        return <button>Click me</button>;
      }
      const renderer = new MountRenderer();
      renderer.render(<Button />);
      const adapter = new Adapter();
      const hostNode = adapter.nodeToHostNode(renderer.getNode() as RSTNode);
      assert.ok(hostNode);
      assert.equal((hostNode as Node).constructor.name, 'HTMLButtonElement');
    });
  });

  describe('#createRenderer', () => {
    it('returns a `MountRenderer` when the mode is "mount"', () => {
      const adapter = new Adapter();
      const renderer = adapter.createRenderer({ mode: 'mount' });
      assert.instanceOf(renderer, MountRenderer);
    });

    it('returns a `ShallowRenderer` when the mode is "mount"', () => {
      const adapter = new Adapter();
      const renderer = adapter.createRenderer({ mode: 'shallow' });
      assert.instanceOf(renderer, ShallowRenderer);
    });

    it('returns a `StringRenderer` when the mode is "string"', () => {
      const adapter = new Adapter();
      const renderer = adapter.createRenderer({ mode: 'string' });
      assert.instanceOf(renderer, StringRenderer);
    });

    it('throws if mode is unsupported', () => {
      const modes = ['unknown'];
      const adapter = new Adapter();
      modes.forEach(mode => {
        assert.throws(() => adapter.createRenderer({ mode } as any));
      });
    });
  });

  describe('#wrapWithWrappingComponent', () => {
    function Button() {
      return <button>Click me</button>;
    }

    function WrappingComponent({
      children,
      ...wrappingComponentProps
    }: {
      children: preact.ComponentChildren;
    }) {
      return <div {...wrappingComponentProps}>{children}</div>;
    }

    it('returns original component when not wrapped', () => {
      const button = <Button />;
      const adapter = new Adapter();
      const hostNode = adapter.wrapWithWrappingComponent(button);

      assert.ok(hostNode);
      assert.typeOf(hostNode.RootFinder, 'function');
      assert.deepEqual(hostNode.node, button);
    });

    it('returns wrapped component', () => {
      const button = <Button />;
      const wrappingComponentProps = { foo: 'bar' };
      const wrappedComponent = (
        <WrappingComponent {...wrappingComponentProps}>
          {button}
        </WrappingComponent>
      );

      const adapter = new Adapter();
      const hostNode = adapter.wrapWithWrappingComponent(button, {
        wrappingComponent: WrappingComponent,
        wrappingComponentProps,
      });

      assert.ok(hostNode);

      const rootFinderInHostNode = hostNode.node.props.children.type;
      assert.equal(hostNode.RootFinder, rootFinderInHostNode);

      const buttonInWrappedComponent = wrappedComponent.props.children;
      const buttonInHostNode = hostNode.node.props.children.props.children;
      assert.equal(buttonInHostNode, buttonInWrappedComponent);
    });
  });
});
