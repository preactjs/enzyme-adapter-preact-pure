import enzyme from 'enzyme';
import * as preact from 'preact';
import { useContext, useState } from 'preact/hooks';
import renderToString from 'preact-render-to-string';

import { assert } from 'chai';

import Adapter from '../../src/Adapter.js';
import {
  addInteractiveTests,
  addStaticTests,
  debugWrappedShallowComponent,
  normalizeDebugMessage,
  WrappingComponent,
  setAdapter,
  disableLifecycleMethodsTests,
} from '../shared.js';

const { Fragment } = preact;
const { shallow } = enzyme;

type TestContextValue = { myTestString: string };

const TestContext = preact.createContext<TestContextValue>({
  myTestString: 'default',
});

describe('integration tests', () => {
  const createAdapter = () => {
    return new Adapter({
      renderToString,
      useCompatShallowRendering: true,
    });
  };

  setAdapter(createAdapter);

  describe('new "shallow" rendering', () => {
    addStaticTests(shallow);
    addInteractiveTests(shallow as any, true);
    disableLifecycleMethodsTests(createAdapter);

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

    // TODO: Enable once preactjs/enzyme-adapter-preact-pure#221 is merged
    it.skip('getElement() exposes root Fragments', () => {
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

      const wrapper = shallow(<App />);

      const frag1 = App();

      assert.equal(frag1.key, '1');

      // Debug exposes root Fragment only
      assert.equal(
        normalizeDebugMessage(wrapper.debug()),
        '<Fragment><div><span>Hello</span>World</div></Fragment>'
      );

      assert.deepEqual(wrapper.first().getElement().key, frag1.key);
      assert.deepEqual(
        wrapper.getElements().map(v => v.key),
        [frag1.key]
      );
      assert.deepEqual(wrapper.get(0).key, frag1.key);
      assert.deepEqual(wrapper.at(0).getElement().key, frag1.key);
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

      const wrapper = shallow(<App />);

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

    it('findWhere only exposes root Fragment', () => {
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

      const wrapper = shallow(<App />);

      // Returns first fragment, but collapses nested fragments if
      // Adapter.isFragment is defined
      assert.equal(wrapper.findWhere(w => w.type() === Fragment).length, 1);
    });

    it('supports update, setState, and setProps on Components that return Fragments with multiple children', () => {
      function Modal({ isOpen }: { isOpen: boolean }) {
        return <div>{isOpen ? 'open' : 'closed'}</div>;
      }

      class App extends preact.Component<
        { text?: string },
        { open: boolean; count: number }
      > {
        static defaultProps = { text: 'Toggle' };

        constructor() {
          super();
          this.state = { open: false, count: 0 };
        }

        toggle = () => {
          this.setState(s => ({ open: !s.open }));
        };

        render() {
          return (
            <>
              <button
                type="button"
                onClick={this.toggle}
                data-count={this.state.count}
              >
                {this.props.text}
              </button>
              <Modal isOpen={this.state.open} />
            </>
          );
        }
      }

      const wrapper = shallow(<App />);
      const getInstance = () => wrapper.instance() as App;

      assert.equal(wrapper.find('button').text(), 'Toggle');
      assert.equal(wrapper.find(Modal).props().isOpen, false);

      getInstance().toggle();
      wrapper.update();
      assert.equal(wrapper.find(Modal).props().isOpen, true);

      getInstance().toggle();
      wrapper.update();
      assert.equal(wrapper.find(Modal).props().isOpen, false);

      wrapper.setState({ count: 10 });
      const buttonProps = wrapper.find('button').props() as any;
      assert.equal(buttonProps['data-count'], 10);

      wrapper.setProps({ text: 'Open' });
      assert.equal(wrapper.find('button').text(), 'Open');
    });
  });
});
