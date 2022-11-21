import enzyme from 'enzyme';
import * as preact from 'preact';
import preactRenderToString from 'preact-render-to-string';
import { useContext, useEffect, useState } from 'preact/hooks';

import { assert } from 'chai';

import Adapter from '../src/Adapter.js';
import { setupJSDOM, teardownJSDOM } from './jsdom.js';
import {
  addInteractiveTests,
  addStaticTests,
  debugWrappedShallowComponent,
  normalizeDebugMessage,
  WrappingComponent,
} from './shared.js';

type TestContextValue = { myTestString: string };

const TestContext = preact.createContext<TestContextValue>({
  myTestString: 'default',
});

const { Fragment } = preact;
const { configure, shallow, mount, render: renderToString } = enzyme;

const createDefaultAdapter = () => new Adapter();
function setAdapter(createNewAdapter: () => Adapter) {
  beforeEach(() => {
    configure({ adapter: createNewAdapter() });
  });

  afterEach(() => {
    configure({ adapter: createDefaultAdapter() });
  });
}

describe('integration tests', () => {
  before(() => {
    configure({ adapter: createDefaultAdapter() });
  });

  describe('"mount" rendering', () => {
    addStaticTests(mount);
    addInteractiveTests(mount);

    it('supports retrieving elements', () => {
      // Test workaround for bug where `Adapter.nodeToElement` is called
      // with undefined `this` by `ReactWrapper#get`.
      const wrapper = mount(
        <div>
          test<span>bar</span>
        </div>
      );
      const div = wrapper.get(0);
      assert.deepEqual(div.type, 'div');
    });

    it('supports rendering into an existing container', () => {
      const container = document.createElement('div');
      const wrapper = mount(<button />, { attachTo: container });
      assert.ok(container.querySelector('button'));
      wrapper.detach();
    });

    it('flushes effects and state updates when using `invoke`', () => {
      let effectCount = 0;

      const Child = ({ children, onClick }: any) => (
        <button onClick={onClick}>{children}</button>
      );
      const Parent = () => {
        const [count, setCount] = useState(0);
        useEffect(() => {
          effectCount = count;
        }, [count]);
        return <Child onClick={() => setCount(c => c + 1)}>{count}</Child>;
      };

      const wrapper = mount(<Parent />);
      // @ts-ignore - `onClick` type is wrong
      wrapper.find('Child').invoke('onClick')();

      assert.equal(wrapper.text(), '1');
      assert.equal(effectCount, 1);
    });

    it('renders wrapped component with wrapper and props', () => {
      function Component() {
        return <span>test</span>;
      }

      const wrapper = mount(<Component />, {
        wrappingComponent: WrappingComponent,
        wrappingComponentProps: { foo: 'bar' },
      });

      const output = normalizeDebugMessage(wrapper.debug());
      assert.equal(
        output,
        '<WrappingComponent foo="bar"><div foo="bar"><Component><span>test</span></Component></div></WrappingComponent>'
      );
    });

    it('passes context to mounted component wrapped with provider', () => {
      function Component() {
        const { myTestString } = useContext(TestContext);
        return <span>{myTestString}</span>;
      }

      const wrapper = mount(<Component />, {
        wrappingComponent: TestContext.Provider,
        wrappingComponentProps: { value: { myTestString: 'override' } },
      });

      const output = normalizeDebugMessage(wrapper.debug());
      assert.equal(
        output,
        '<Provider value={{...}}><Component><span>override</span></Component></Provider>'
      );
    });

    // TODO: Enable once preactjs/enzyme-adapter-preact-pure#221 is merged
    it.skip('getElement() returns top-level rendered component', () => {
      function App() {
        return (
          <Fragment key="1">
            <Fragment key="2">
              <div key="div">
                <Fragment key="3">
                  <Fragment key="4">
                    <span>Hello</span>
                  </Fragment>
                </Fragment>
                <Fragment key="text">World</Fragment>
              </div>
            </Fragment>
          </Fragment>
        );
      }

      const appKey = 'app';
      const wrapper = mount(<App key={appKey} />);

      assert.equal(
        normalizeDebugMessage(wrapper.debug()),
        '<App><div><span>Hello</span>World</div></App>'
      );

      assert.deepEqual(wrapper.first().getElement().key, appKey);
      assert.deepEqual(
        wrapper.getElements().map(v => v.key),
        [appKey]
      );
      assert.deepEqual(wrapper.get(0).key, appKey);
      assert.deepEqual(wrapper.at(0).getElement().key, appKey);
    });

    it('children() hides all Fragments', () => {
      function App() {
        return (
          <Fragment key="1">
            <Fragment key="2">
              <div key="div">
                <Fragment key="3">
                  <Fragment key="4">
                    <span>Hello</span>
                  </Fragment>
                </Fragment>
                <Fragment key="text">World</Fragment>
              </div>
            </Fragment>
          </Fragment>
        );
      }

      const wrapper = mount(<App />);

      const frag1 = App();
      const frag2 = frag1.props.children;
      const divVNode = frag2.props.children;

      assert.equal(frag1.key, '1');
      assert.equal(frag2.key, '2');
      assert.equal(divVNode.key, 'div');

      assert.equal(wrapper.children().length, 1);
      assert.equal(wrapper.children().at(0).key(), divVNode.key);
      assert.equal(wrapper.childAt(0).key(), divVNode.key);

      assert.equal(wrapper.children().children().length, 2);
      assert.equal(wrapper.children().children().at(0).type(), 'span');
      // Difference from React => we return string, etc. children and don't nullify them
      assert.equal(
        wrapper.children().children().at(1).getElement(),
        'World' as any
      );
    });

    it('findWhere ignores all Fragment', () => {
      function App() {
        return (
          <Fragment key="1">
            <Fragment key="2">
              <div key="div">
                <Fragment key="3">
                  <Fragment key="4">
                    <span>Hello</span>
                  </Fragment>
                </Fragment>
                <Fragment key="text">World</Fragment>
              </div>
            </Fragment>
          </Fragment>
        );
      }

      const wrapper = mount(<App />);
      assert.equal(wrapper.findWhere(w => w.type() === Fragment).length, 0);
    });

    describe('simulateEventsOnComponents: true', () => {
      setAdapter(() => new Adapter({ simulateEventsOnComponents: true }));

      it('supports simulating events on deep Components and elements', () => {
        function FancyButton({ onClick, children }: any) {
          return (
            <button type="button" onClick={onClick}>
              {children}
            </button>
          );
        }

        function FancierButton({ onClick, children }: any) {
          return <FancyButton onClick={onClick}>{children}</FancyButton>;
        }

        function App() {
          const [count, setCount] = useState(0);

          return (
            <div>
              <div id="count">Count: {count}</div>
              <FancierButton onClick={() => setCount(count + 1)}>
                Increment
              </FancierButton>
            </div>
          );
        }

        const wrapper = mount(<App />);
        assert.equal(wrapper.find('#count').text(), 'Count: 0');

        wrapper.find(FancyButton).simulate('click');
        assert.equal(wrapper.find('#count').text(), 'Count: 1');

        wrapper.find('button').simulate('click');
        assert.equal(wrapper.find('#count').text(), 'Count: 2');
      });
    });
  });

  describe('"shallow" rendering', () => {
    addStaticTests(shallow);
    addInteractiveTests(shallow as any);

    it('does not render child components', () => {
      function Child() {
        return <span>Two</span>;
      }

      function NestedChild({ label }: any) {
        return (
          <div>
            <p>{label}</p>
            <Child />
          </div>
        );
      }

      function Parent() {
        return (
          <div>
            <span>One</span>
            <Child />
            <span>Three</span>
            <NestedChild label="test" />
          </div>
        );
      }

      const wrapper = shallow(<Parent />);

      // `text()` outputs placeholders to represent un-rendered child components
      // in shallow rendering.
      assert.equal(wrapper.text(), 'One<Child />Three<NestedChild />');
    });

    it('fully renders only the root element', () => {
      function Component() {
        return <span>test</span>;
      }
      const wrapper = shallow(
        <div>
          {/* This should not be rendered as it is not the root component. */}
          <Component />
        </div>
      );
      const output = normalizeDebugMessage(wrapper.debug());
      assert.equal(output, '<div><Component /></div>');
    });

    it('renders wrapped component with wrapper and props', () => {
      function Component() {
        return <span>test</span>;
      }
      const wrapper = shallow(<Component />, {
        wrappingComponent: WrappingComponent,
        wrappingComponentProps: { foo: 'bar' },
      });

      const output = debugWrappedShallowComponent(wrapper);
      assert.equal(
        output,
        '<div foo="bar"><RootFinder><Component /></RootFinder></div>'
      );
    });

    it('passes context to shallow component with function returning TestContext.Provider', () => {
      function WrappingComponentWithContextProvider({
        children,
        value,
      }: {
        children: preact.ComponentChildren;
        value: TestContextValue;
      }) {
        return (
          <TestContext.Provider value={value}>{children}</TestContext.Provider>
        );
      }

      function Component() {
        const { myTestString } = useContext(TestContext);
        return <span>{myTestString}</span>;
      }

      const wrapper = shallow(<Component />, {
        wrappingComponent: WrappingComponentWithContextProvider,
        wrappingComponentProps: { value: { myTestString: 'override' } },
      });

      const output = debugWrappedShallowComponent(wrapper);
      assert.equal(
        output,
        '<Provider value={{...}}><RootFinder><Component /></RootFinder></Provider>'
      );

      const outputHtml = wrapper.getWrappingComponent().html();
      assert.equal(outputHtml, '<span>override</span>');
    });

    it('passes context to shallow component with TestContext.Provider as wrappingComponent', () => {
      function Component() {
        const { myTestString } = useContext(TestContext);
        return <span>{myTestString}</span>;
      }

      const wrapper = shallow(<Component />, {
        wrappingComponent: TestContext.Provider,
        wrappingComponentProps: { value: { myTestString: 'override' } },
      });

      const output = debugWrappedShallowComponent(wrapper);
      assert.equal(output, '<RootFinder><Component /></RootFinder>');

      const outputHtml = wrapper.getWrappingComponent().html();
      // NOTE:
      // Ideally the value of `outputHtml` would be `<span>override</span>` but Enzyme and this library
      // currently don't forwarding context values set via wrappingComponentProps, see also:
      // https://github.com/enzymejs/enzyme/issues/2176
      assert.equal(outputHtml, '<span>default</span>');
    });

    describe('rendering children of non-rendered components', () => {
      const Component: any = () => {
        return null;
      };

      it('renders one HTML component child', () => {
        const wrapperWithHTMLElement = shallow(
          <div>
            <Component>
              <p>foo</p>
            </Component>
          </div>
        );

        const output = normalizeDebugMessage(wrapperWithHTMLElement.debug());
        assert.equal(output, '<div><Component><p>foo</p></Component></div>');
      });

      it('renders multiple HTML component children', () => {
        const wrapperWithMultipleHTMLElements = shallow(
          <div>
            <Component>
              <p>foo</p>
              <span>bar</span>
            </Component>
          </div>
        );

        const output = normalizeDebugMessage(
          wrapperWithMultipleHTMLElements.debug()
        );
        assert.equal(
          output,
          '<div><Component><p>foo</p><span>bar</span></Component></div>'
        );
      });

      it('renders with a string child', () => {
        const wrapperWithString = shallow(
          <div>
            <Component>Foobar</Component>
          </div>
        );

        const output = normalizeDebugMessage(wrapperWithString.debug());
        assert.equal(output, '<div><Component>Foobar</Component></div>');
      });

      it('renders with a number child', () => {
        const numberValue = 1234;
        const wrapperWithNumber = shallow(
          <div>
            <Component>{numberValue}</Component>
          </div>
        );

        const output = normalizeDebugMessage(wrapperWithNumber.debug());
        assert.equal(output, '<div><Component>1234</Component></div>');
      });
    });

    it('renders children of components rendered without JSX', () => {
      const Component: any = (props: any) => {
        return <div>{props.children}</div>;
      };

      const wrapper = shallow(
        <div>
          {preact.h(
            Component,
            null,
            preact.h('p', null, 'foo'),
            preact.h('p', null, 'bar')
          )}
        </div>
      );
      const output = normalizeDebugMessage(wrapper.debug());
      assert.equal(
        output,
        '<div><Component><p>foo</p><p>bar</p></Component></div>'
      );
    });

    it('renders components that take a function as `children`', () => {
      function Child(props: any) {
        return props.children();
      }

      function Parent(props: any) {
        return <Child>{() => <div>Example</div>}</Child>;
      }

      let wrapper = shallow(<Parent />);
      const childrenFunc = wrapper.prop('children') as any;
      wrapper = shallow(childrenFunc());

      assert.equal(wrapper.text(), 'Example');
    });

    describe('simulateEventsOnComponents: true', () => {
      setAdapter(() => new Adapter({ simulateEventsOnComponents: true }));

      it('supports simulating events on Components', () => {
        function FancyButton({ onClick, children }: any) {
          return (
            <button type="button" onClick={onClick}>
              {children}
            </button>
          );
        }

        function App() {
          const [count, setCount] = useState(0);

          return (
            <div>
              <div id="count">Count: {count}</div>
              <FancyButton onClick={() => setCount(count + 1)}>
                Increment
              </FancyButton>
            </div>
          );
        }

        const wrapper = shallow(<App />);
        assert.equal(wrapper.find('#count').text(), 'Count: 0');

        wrapper.find(FancyButton).simulate('click');
        assert.equal(wrapper.find('#count').text(), 'Count: 1');
      });
    });
  });

  describe('"string" rendering', () => {
    addStaticTests(renderToString as any);

    describe('using preact-render-to-string (renderToString option)', () => {
      setAdapter(() => new Adapter({ renderToString: preactRenderToString }));

      // Ensure this flag works without a JSDOM environment so tear it down if
      // it exists before running these tests
      let reinitJSDOM = false;
      before(() => {
        if (globalThis.window) {
          reinitJSDOM = true;
          teardownJSDOM();
        }
      });

      after(() => {
        if (reinitJSDOM) {
          setupJSDOM();
          reinitJSDOM = false;
        }
      });

      addStaticTests(renderToString as any);
    });
  });
});
