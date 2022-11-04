import { assert } from 'chai';
import type { VNode } from 'preact';
import { Component, Fragment } from 'preact';
import * as preact from 'preact';
import type { NodeType, RSTNode } from 'enzyme';

import {
  getNode,
  getShallowNode,
  rstNodeFromElement,
} from '../src/preact10-rst.js';
import { getType } from '../src/util.js';
import { render } from '../src/compat.js';

function Child({ label }: any) {
  return <div>{label}</div>;
}

function Parent({ label }: any) {
  return <Child label={label} />;
}

function Section({ children }: any) {
  return <section>{children}</section>;
}

class ClassComponent extends Component<{ label: string }> {
  render() {
    return <span>{this.props.label}</span>;
  }
}

function FunctionComponent({ label }: any) {
  return <div>{label}</div>;
}

const ArrowFunctionComponent = ({ label }: any) => <div>{label}</div>;

function NumberComponent({ value }: { value: number }) {
  return <div>{value}</div>;
}

function EmptyComponent() {
  return null;
}

function functionNode({
  type,
  rendered,
  props = {},
  key = null,
  ref = null,
}: any) {
  return {
    nodeType: 'function' as NodeType,
    type,
    rendered: rendered || [],
    props,
    key,
    ref,
    instance: type.name,
  };
}

function classNode({
  type,
  rendered = [],
  props = {},
  key = null,
  ref = null,
}: any) {
  return {
    nodeType: 'class' as NodeType,
    type,
    rendered,
    props,
    key,
    ref,
    instance: type.name,
  };
}

function fragmentNode({
  rendered = [],
  key = null,
}: {
  rendered?: any[];
  key?: string | null;
}): RSTNode {
  return {
    nodeType: 'function' as NodeType,
    type: Fragment,
    rendered,
    props: {},
    key,
    ref: null,
    instance: Fragment.name,
  };
}

function getConstructorName(name: string) {
  const el = document.createElement(name);
  return el.constructor.name;
}

function hostNode({
  type,
  rendered = [],
  props = {},
  key = null,
  ref = null,
}: any) {
  return {
    nodeType: 'host' as NodeType,
    type,
    rendered,
    props,
    key,
    ref,
    instance: getConstructorName(type),
  };
}

function filterNode(node: RSTNode | null) {
  if (!node) {
    return node;
  }

  // Ignore `children` prop during comparisons.
  const props = { ...node.props };
  delete props.children;
  node.props = props;

  // Convert instance from an object reference to a string indicating the
  // object type, which is easier to test against.
  if (node.instance._constructor) {
    node.instance = node.instance._constructor.name;
  } else {
    node.instance = getType(node.instance);
  }

  // Process rendered output.
  node.rendered.forEach(node => {
    if (node && typeof node !== 'string' && node.nodeType) {
      filterNode(node);
    }
  });

  return node;
}

const testRef = () => {};

const treeCases = [
  {
    description: 'simple DOM element',
    element: <div>Hello</div>,
    expectedTree: hostNode({ type: 'div', rendered: ['Hello'] }),
  },
  {
    description: 'DOM element with children',
    element: (
      <div>
        <span />
        <br />
      </div>
    ),
    expectedTree: hostNode({
      type: 'div',
      rendered: [hostNode({ type: 'span' }), hostNode({ type: 'br' })],
    }),
  },
  {
    description: 'DOM element with props',
    element: <img alt="Image label" />,
    expectedTree: hostNode({
      type: 'img',
      rendered: [],
      props: { alt: 'Image label' },
    }),
  },
  {
    description: 'function component',
    element: <FunctionComponent label="Hello" />,
    expectedTree: functionNode({
      type: FunctionComponent,
      rendered: [hostNode({ type: 'div', rendered: ['Hello'] })],
      props: { label: 'Hello' },
    }),
  },
  {
    description: 'function component (arrow function)',
    element: <ArrowFunctionComponent label="Hello" />,
    expectedTree: functionNode({
      type: ArrowFunctionComponent,
      rendered: [hostNode({ type: 'div', rendered: ['Hello'] })],
      props: { label: 'Hello' },
    }),
  },
  {
    description: 'numeric child (nonzero number)',
    element: <NumberComponent value={42} />,
    expectedTree: functionNode({
      type: NumberComponent,
      rendered: [hostNode({ type: 'div', rendered: ['42'] })],
      props: { value: 42 },
    }),
  },
  {
    description: 'numeric child (zero number)',
    element: <NumberComponent value={0} />,
    expectedTree: functionNode({
      type: NumberComponent,
      rendered: [hostNode({ type: 'div', rendered: ['0'] })],
      props: { value: 0 },
    }),
  },
  {
    description: 'class component',
    element: <ClassComponent label="Hello" />,
    expectedTree: classNode({
      type: ClassComponent,
      rendered: [hostNode({ type: 'span', rendered: ['Hello'] })],
      props: { label: 'Hello' },
    }),
  },
  {
    description: 'component that renders another component',
    element: <Parent label="Hello" />,
    expectedTree: functionNode({
      type: Parent,
      rendered: [
        functionNode({
          type: Child,
          rendered: [hostNode({ type: 'div', rendered: ['Hello'] })],
          props: { label: 'Hello' },
        }),
      ],
      props: { label: 'Hello' },
    }),
  },
  {
    description: 'component that renders children',
    element: (
      <Section>
        <p>Section content</p>
      </Section>
    ),
    expectedTree: functionNode({
      type: Section,
      rendered: [
        hostNode({
          type: 'section',
          rendered: [hostNode({ type: 'p', rendered: ['Section content'] })],
        }),
      ],
      props: {},
    }),
  },
  {
    description: 'component that has a key',
    element: <Child label="test" key="a-key" />,
    expectedTree: functionNode({
      type: Child,
      key: 'a-key',
      props: { label: 'test' },
      rendered: [hostNode({ type: 'div', rendered: ['test'] })],
    }),
  },
  {
    description: 'DOM element that has a key',
    element: <div key="a-key" />,
    expectedTree: hostNode({
      type: 'div',
      key: 'a-key',
    }),
  },
  {
    description: 'component that has a ref',
    element: <ClassComponent label="test" ref={testRef} />,
    expectedTree: classNode({
      type: ClassComponent,
      ref: testRef,
      rendered: [hostNode({ type: 'span', rendered: ['test'] })],
      props: { label: 'test' },
    }),
  },
  {
    description: 'DOM element that has a ref',
    element: <div ref={testRef} />,
    expectedTree: hostNode({
      type: 'div',
      ref: testRef,
    }),
  },
  {
    description: 'component that renders `null`',
    element: <EmptyComponent />,
    expectedTree: functionNode({
      type: EmptyComponent,
      rendered: [],
    }),
  },
];

function renderToRST(el: VNode, container?: HTMLElement): RSTNode | null {
  if (!container) {
    container = document.createElement('div');
  }
  render(el, container);
  const rootNode = getNode(container);
  return filterNode(rootNode);
}

function renderToShallowRST(
  el: VNode,
  container?: HTMLElement
): RSTNode | null {
  if (!container) {
    container = document.createElement('div');
  }
  render(el, container);
  const rootNode = getShallowNode(container);
  return filterNode(rootNode);
}

describe('preact10-rst', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
  });

  afterEach(() => {
    container.remove();
  });

  describe('getNode', () => {
    treeCases.forEach(({ description, element, expectedTree }) => {
      it(`returns expected RST node (${description})`, () => {
        assert.deepEqual(renderToRST(element), expectedTree);
      });
    });

    it('ignores fragments in result', () => {
      const el = (
        <ul>
          <Fragment>
            <li>1</li>
            <li>2</li>
          </Fragment>
          <Fragment>
            <li>3</li>
            <li>4</li>
          </Fragment>
        </ul>
      );
      const expectedTree = hostNode({
        type: 'ul',
        rendered: [
          hostNode({ type: 'li', rendered: ['1'] }),
          hostNode({ type: 'li', rendered: ['2'] }),
          hostNode({ type: 'li', rendered: ['3'] }),
          hostNode({ type: 'li', rendered: ['4'] }),
        ],
      });
      assert.deepEqual(renderToRST(el), expectedTree);
    });

    it('flattens nested fragments', () => {
      const el = (
        <ul>
          <Fragment>
            <li>1</li>
            <Fragment>
              <li>2</li>
              <li>3</li>
            </Fragment>
            <li>4</li>
          </Fragment>
        </ul>
      );
      const expectedTree = hostNode({
        type: 'ul',
        rendered: [
          hostNode({ type: 'li', rendered: ['1'] }),
          hostNode({ type: 'li', rendered: ['2'] }),
          hostNode({ type: 'li', rendered: ['3'] }),
          hostNode({ type: 'li', rendered: ['4'] }),
        ],
      });
      assert.deepEqual(renderToRST(el), expectedTree);
    });

    it('supports components that return fragments', () => {
      function ListItems({ items }: { items: number[] }) {
        return (
          <Fragment>
            {items.map(item => (
              <li>{item}</li>
            ))}
          </Fragment>
        );
      }
      const el = (
        <ul>
          <ListItems items={[1, 2]} />
          <ListItems items={[3, 4]} />
        </ul>
      );
      const expectedTree = hostNode({
        type: 'ul',
        rendered: [
          functionNode({
            type: ListItems,
            props: { items: [1, 2] },
            rendered: [
              hostNode({ type: 'li', rendered: ['1'] }),
              hostNode({ type: 'li', rendered: ['2'] }),
            ],
          }),
          functionNode({
            type: ListItems,
            props: { items: [3, 4] },
            rendered: [
              hostNode({ type: 'li', rendered: ['3'] }),
              hostNode({ type: 'li', rendered: ['4'] }),
            ],
          }),
        ],
      });
      assert.deepEqual(renderToRST(el), expectedTree);
    });

    it('throws an error if the root node renders multiple children', () => {
      const el = (
        <Fragment>
          <li>1</li>
          <li>2</li>
        </Fragment>
      );
      assert.throws(() => {
        renderToRST(el);
      }, 'Root element must not be a fragment with multiple children');
    });

    it('converts components with text children to RST nodes', () => {
      function TestComponent() {
        return 'some text' as any;
      }
      const rstNode = renderToRST(<TestComponent />, container)!;
      assert.deepEqual(rstNode.rendered, ['some text']);
    });

    it('converts Preact prop names to RST prop names', () => {
      function TestComponent() {
        return <div class="widget" />;
      }
      const rstNode = filterNode(renderToRST(<TestComponent />, container))!;
      assert.equal(rstNode.rendered.length, 1);
      assert.deepEqual((rstNode.rendered[0] as RSTNode).props, {
        className: 'widget',
      });
    });
  });

  describe('getShallowNode', () => {
    treeCases.forEach(({ description, element, expectedTree }) => {
      it(`returns expected RST node (${description})`, () => {
        assert.deepEqual(renderToShallowRST(element), expectedTree);
      });
    });

    it('preserves fragments in result', () => {
      const el = (
        <ul>
          <Fragment>
            <li>1</li>
            <li>2</li>
          </Fragment>
          <Fragment>
            <li>3</li>
            <li>4</li>
          </Fragment>
        </ul>
      );
      const expectedTree = hostNode({
        type: 'ul',
        rendered: [
          fragmentNode({
            rendered: [
              hostNode({ type: 'li', rendered: ['1'] }),
              hostNode({ type: 'li', rendered: ['2'] }),
            ],
          }),
          fragmentNode({
            rendered: [
              hostNode({ type: 'li', rendered: ['3'] }),
              hostNode({ type: 'li', rendered: ['4'] }),
            ],
          }),
        ],
      });
      assert.deepEqual(renderToShallowRST(el), expectedTree);
    });

    it('preserves nested fragments', () => {
      const el = (
        <ul>
          <Fragment>
            <li>1</li>
            <Fragment>
              <li>2</li>
              <li>3</li>
            </Fragment>
            <li>4</li>
          </Fragment>
        </ul>
      );
      const expectedTree = hostNode({
        type: 'ul',
        rendered: [
          fragmentNode({
            rendered: [
              hostNode({ type: 'li', rendered: ['1'] }),
              fragmentNode({
                rendered: [
                  hostNode({ type: 'li', rendered: ['2'] }),
                  hostNode({ type: 'li', rendered: ['3'] }),
                ],
              }),
              hostNode({ type: 'li', rendered: ['4'] }),
            ],
          }),
        ],
      });
      assert.deepEqual(renderToShallowRST(el), expectedTree);
    });
  });

  describe('rstNodeFromElement', () => {
    function stripInstances(node: RSTNode | string | null) {
      if (node == null || typeof node === 'string') {
        return node;
      }

      node.instance = null;

      node.rendered.forEach(child => {
        stripInstances(child);
      });
      return node;
    }

    [
      {
        description: 'function component',
        element: <FunctionComponent />,
        expectedNode: functionNode({
          type: FunctionComponent,
        }),
      },
      {
        description: 'class component',
        element: <ClassComponent label="test" />,
        expectedNode: classNode({
          type: ClassComponent,
          props: { label: 'test' },
        }),
      },
      {
        description: 'host node',
        element: <div />,
        expectedNode: hostNode({ type: 'div' }),
      },
      {
        description: 'host node with props',
        element: <img alt="test" class="foo" />,
        expectedNode: hostNode({
          type: 'img',
          props: { alt: 'test', className: 'foo' },
        }),
      },
      {
        description: 'component with props',
        element: <FunctionComponent class="foo" />,
        expectedNode: functionNode({
          type: FunctionComponent,
          props: { class: 'foo' },
        }),
      },
      {
        description: 'element with key',
        element: <li key="foo" />,
        expectedNode: hostNode({ type: 'li', key: 'foo' }),
      },
      {
        description: 'element with ref',
        element: <li ref={testRef} />,
        expectedNode: hostNode({ type: 'li', ref: testRef }),
      },
      {
        description: 'element with children',
        element: (
          <ul>
            <li>item</li>
          </ul>
        ),
        expectedNode: hostNode({
          type: 'ul',
          rendered: [hostNode({ type: 'li', rendered: ['item'] })],
        }),
      },
    ].forEach(({ description, element, expectedNode }) => {
      it(`converts node to element (${description})`, () => {
        const rstNode = rstNodeFromElement(element);
        assert.deepEqual(rstNode, stripInstances(expectedNode));
      });
    });
  });
});
