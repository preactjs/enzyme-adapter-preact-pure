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
} from '../shared.js';

type TestContextValue = { myTestString: string };

const TestContext = preact.createContext<TestContextValue>({
  myTestString: 'default',
});

const { shallow } = enzyme;

describe('integration tests', () => {
  setAdapter(() => {
    return new Adapter({
      renderToString,
      useNewShallowRendering: true,
    });
  });

  describe('new "shallow" rendering', () => {
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
