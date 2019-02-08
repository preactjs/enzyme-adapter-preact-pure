import { Component, h } from 'preact';
import { NodeType, RSTNode } from 'enzyme';
import { assert } from 'chai';
import * as sinon from 'sinon';

import MountRenderer from '../src/MountRenderer';

function FunctionComponent({ label }: any) {
  return <div>{label}</div>;
}

class ClassComponent extends Component<{ label: string }> {
  render() {
    return <span>{this.props.label}</span>;
  }
}

function Child({ label }: any) {
  return <div>{label}</div>;
}

function Parent({ label }: any) {
  return <Child label={label} />;
}

function Section({ children }: any) {
  return <section>{...children}</section>;
}

function hostNode({ type, rendered, props }: any) {
  const hostProps = props || {};
  return {
    nodeType: 'host' as NodeType,
    type,
    rendered: rendered || [],
    props: {
      children: hostProps.children || [],
      ...hostProps,
    },
    key: null,
    ref: null,
    instance: null,
  };
}

function classNode({ type, rendered, props }: any) {
  props = props || {};
  return {
    nodeType: 'class' as NodeType,
    type,
    rendered: rendered || [],
    props: {
      children: props.children || [],
      ...props,
    },
    key: null,
    ref: null,
    instance: null,
  };
}

function functionNode({ type, rendered, props }: any) {
  props = props || {};
  return {
    nodeType: 'function' as NodeType,
    type,
    rendered: rendered || [],
    props: {
      children: props.children || [],
      ...props,
    },
    key: null,
    ref: null,
    instance: null,
  };
}

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
      props: {
        children: [<p>Section content</p>],
      },
    }),
  },
];

function filterNode(node: RSTNode | null) {
  if (!node) {
    return node;
  }

  node.instance = null;
  node.rendered.forEach(node => {
    if (node && typeof node !== 'string' && node.nodeType) {
      filterNode(node);
    }
  });
  return node;
}

describe('MountRenderer', () => {
  describe('#render', () => {
    it('renders the element', () => {
      const renderer = new MountRenderer();
      renderer.render(<div>Hello</div>, {}, sinon.stub());

      const HTMLDivElement = (global as any).window.HTMLDivElement;
      assert.instanceOf(renderer.rootNode(), HTMLDivElement);
    });

    it('invokes the post-render callback', () => {
      const renderer = new MountRenderer();
      const callback = sinon.stub();
      renderer.render(<div>Hello</div>, {}, callback);
      sinon.assert.called(callback);
    });
  });

  describe('#unmount', () => {
    it('removes the rendered DOM elements', () => {
      const renderer = new MountRenderer();
      renderer.render(<div>Hello</div>, {}, sinon.stub());
      const container = (renderer.rootNode() as ChildNode)
        .parentNode as Element;
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

    treeCases.forEach(({ description, element, expectedTree }) => {
      it(`renders expected RST node (${description})`, () => {
        const renderer = new MountRenderer();
        renderer.render(element, {}, sinon.stub());
        assert.deepEqual(filterNode(renderer.getNode()), expectedTree);
      });
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
  });
});
