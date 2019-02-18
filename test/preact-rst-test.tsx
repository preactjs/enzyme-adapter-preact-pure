import { assert } from 'chai';
import { Component, VNode, h } from 'preact';
import { NodeType, RSTNode } from 'enzyme';

import { getNode as getNodeV10 } from '../src/preact10-rst';
import { getNode as getNodeClassic } from '../src/preact-rst';
import { getType, isPreact10 } from '../src/util';
import { render } from '../src/compat';

function Child({ label }: any) {
  return <div>{label}</div>;
}

function Parent({ label }: any) {
  return <Child label={label} />;
}

function Section({ children }: any) {
  return <section>{...children}</section>;
}

class ClassComponent extends Component<{ label: string }> {
  render() {
    return <span>{this.props.label}</span>;
  }
}

function FunctionComponent({ label }: any) {
  return <div>{label}</div>;
}

function NumberComponent({ value }: { value: number }) {
  return <div>{value}</div>;
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
];

function renderToRST(el: VNode, container: HTMLElement): RSTNode {
  render(el, container);
  return isPreact10() ? getNodeV10(container) : getNodeClassic(container);
}

describe('preact-rst, preact10-rst', () => {
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
        const container = document.createElement('div');
        const rstNode = renderToRST(element, container);
        assert.deepEqual(filterNode(rstNode), expectedTree);
      });
    });

    it('converts components with text children to RST nodes', () => {
      function TestComponent() {
        return 'some text' as any;
      }
      const rstNode = renderToRST(<TestComponent />, container);
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
});
