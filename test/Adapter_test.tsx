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
function stripInternalVNodeFields(obj: object | string) {
  if (typeof obj == 'string') {
    return obj;
  }

  const result = {} as Record<string, any>;
  for (const [key, value] of Object.entries(obj)) {
    if (!key.startsWith('__')) {
      if (Array.isArray(value)) {
        result[key] = value.map(v => stripInternalVNodeFields(v));
      } else if (typeof value === 'object' && value !== null) {
        result[key] = stripInternalVNodeFields(value);
      } else {
        result[key] = value;
      }
    }
  }
  return result as preact.VNode<any>;
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
    // Conversion from Preact elements to RST nodes is a lossy process because
    // we clear the children prop, so converting back (RST nodes to Preact
    // elements) will also be lossy. We have commented out that tests that do
    // not pass due to this lossy behavior. Perhaps in the future we should
    // investigate and fix this.

    function TextComponent() {
      return 'test' as unknown as preact.VNode<any>;
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
        description: 'Simple DOM element',
        element: <button type="button">Click me</button>,
      },
      {
        description: 'DOM elements with keys',
        element: (
          <ul>
            <li key={1}>Test</li>
            <li key={2}>Test</li>
          </ul>
        ),
      },
      {
        description: 'DOM element with ref',
        element: <div ref={() => {}} />,
      },
      {
        description: 'Component that renders text',
        element: <TextComponent />,
        expected: {
          type: TextComponent,
          constructor: undefined,
          key: undefined,
          ref: undefined,
          props: {
            children: 'test',
          },
        },
      },
      {
        description: 'Component with children',
        element: <Parent />,
        expected: {
          type: Parent,
          constructor: undefined,
          key: undefined,
          ref: undefined,
          props: {
            children: {
              type: 'div',
              constructor: undefined,
              key: undefined,
              ref: undefined,
              props: {
                children: {
                  type: Child,
                  constructor: undefined,
                  key: undefined,
                  ref: undefined,
                  props: {
                    children: {
                      type: 'span',
                      constructor: undefined,
                      key: undefined,
                      ref: undefined,
                      props: {
                        children: 'child',
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      {
        description: 'Element with mixed typed children',
        element: <div>{[null, undefined, true, false, 0, 1n, 'a string']}</div>,
        expected: {
          type: 'div',
          constructor: undefined,
          key: undefined,
          ref: undefined,
          props: {
            children: ['0', '1', 'a string'],
          },
        },
      },
    ].forEach(({ description, element, expected }) => {
      it(`returns JSX element that matches original input (${description})`, () => {
        const renderer = new MountRenderer();
        renderer.render(element);
        const adapter = new Adapter();
        const rstNode = renderer.getNode() as RSTNode;
        assert.deepEqual(
          stripInternalVNodeFields(adapter.nodeToElement(rstNode)),
          expected ?? stripInternalVNodeFields(element)
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
