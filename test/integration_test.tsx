import type { CommonWrapper } from 'enzyme';
import enzyme from 'enzyme';
import { Component, Fragment, options } from 'preact';
import * as preact from 'preact';
import preactRenderToString from 'preact-render-to-string';
import { useContext, useEffect, useState } from 'preact/hooks';
import type { ReactElement } from 'react';

import { assert } from 'chai';
import sinon from 'sinon';

import Adapter from '../src/Adapter.js';
import { setupJSDOM, teardownJSDOM } from './jsdom.js';

type TestContextValue = { myTestString: string };

const TestContext = preact.createContext<TestContextValue>({
  myTestString: 'default',
});

const { configure, shallow, mount, render: renderToString } = enzyme;

function normalizeDebugMessage(message: string) {
  return message.replace(/\s{2,}/g, '').replace(/>\s/g, '>');
}

function debugWrappedShallowComponent(wrapper: enzyme.ShallowWrapper) {
  return normalizeDebugMessage(wrapper.getWrappingComponent().debug());
}

function WrappingComponent({
  children,
  ...wrappingComponentProps
}: {
  children: preact.ComponentChildren;
}) {
  return <div {...wrappingComponentProps}>{children}</div>;
}

interface Wrapper extends CommonWrapper {
  find(query: any): CommonWrapper;
}

/**
 * Register tests for static and interactive rendering modes.
 */
function addStaticTests(render: (el: ReactElement) => Wrapper) {
  const isStringRenderer = (render as any) === renderToString;

  it('renders a simple component', () => {
    function Button({ label }: any) {
      return <button>{label}</button>;
    }
    const wrapper = render(<Button label="Click me" />);
    assert.ok(wrapper.find('button'));
  });

  it('can return text content', () => {
    function Button({ label }: any) {
      return <button>{label}</button>;
    }

    const wrapper = render(<Button label="Click me" />);
    assert.equal(wrapper.text(), 'Click me');
  });

  it('can return HTML content', () => {
    function Button({ label }: any) {
      return <button>{label}</button>;
    }

    const wrapper = mount(<Button label="Click me" />);
    assert.equal(wrapper.html(), '<button>Click me</button>');
  });

  if (!isStringRenderer) {
    it('can find DOM nodes by class name', () => {
      function Widget() {
        return <div class="widget">Test</div>;
      }
      const wrapper = render(<Widget />);
      assert.equal(wrapper.find('.widget').length, 1);
    });

    it('can test if result contains subtree', () => {
      function ListItem({ label }: any) {
        return <b>{label}</b>;
      }
      function List() {
        return (
          <ul>
            <li>
              <ListItem label="test" />
            </li>
          </ul>
        );
      }
      const wrapper = render(<List />);

      assert.isTrue(wrapper.contains(<ListItem label="test" />));
      assert.isTrue(
        wrapper.contains(
          <li>
            <ListItem label="test" />
          </li>
        )
      );
      assert.isFalse(wrapper.contains(<ListItem label="foo" />));
      assert.isFalse(
        wrapper.contains(
          <p>
            <ListItem label="test" />
          </p>
        )
      );
    });
  }

  if (!isStringRenderer) {
    it('returns contents of fragments', () => {
      const el = (
        <div>
          <Fragment>
            <span>one</span>
            <span>two</span>
            <Fragment>
              <span>three</span>
            </Fragment>
          </Fragment>
        </div>
      );
      const wrapper = (render(el) as any).find('div').children();
      assert.equal(wrapper.length, 3);
    });
  }
}

/**
 * Register tests for interactive rendering modes (full + shallow rendering).
 */
function addInteractiveTests(render: typeof mount) {
  const isMount = (render as any) === mount;
  const isShallow = (render as any) === shallow;

  it('supports finding child components', () => {
    function ListItem() {
      return <li>Test</li>;
    }

    function List() {
      return (
        <ul>
          <ListItem />
          <ListItem />
        </ul>
      );
    }

    const wrapper = render(<List />);
    const items = wrapper.find('ul > ListItem');
    assert.equal(items.length, 2);
  });

  it('can return props of child component', () => {
    function ListItem({ label }: any) {
      return <li>{label}</li>;
    }
    function List() {
      return (
        <ul>
          <ListItem label="test" />
        </ul>
      );
    }
    const wrapper = render(<List />);
    const item = wrapper.find('ListItem');
    assert.deepEqual(item.props(), { label: 'test', children: [] });
  });

  it('can traverse a tree with text nodes', () => {
    function Widget() {
      return (
        <div>
          <span>foo</span>
        </div>
      );
    }
    const wrapper = render(<Widget />);
    const matches = wrapper
      .findWhere((n: any) => n.text() === 'foo')
      .map((n: any) => n.type());

    // nb. The node with `undefined` type is the Text node itself.
    let expected: Array<string | preact.AnyComponent | undefined>;
    if (isMount) {
      expected = [Widget, 'div', 'span', undefined];
    } else if (isShallow) {
      // Shallow rendering omits the top-level component in the output.
      expected = ['div', 'span', undefined];
    } else {
      expected = [];
    }

    assert.deepEqual(matches, expected);
  });

  it('can find child components by type', () => {
    function ListItem({ label }: any) {
      return <li>{label}</li>;
    }
    function List() {
      return (
        <ul>
          <ListItem label="test" />
        </ul>
      );
    }
    const wrapper = render(<List />);
    assert.equal(wrapper.find(ListItem).length, 1);
  });

  it('can set the props of the component', () => {
    const Button = ({ label }: any) => <button>{label}</button>;
    const wrapper = render(<Button label="first" />);
    assert.equal(wrapper.text(), 'first');
    wrapper.setProps({ label: 'second' });
    assert.equal(wrapper.text(), 'second');
  });

  it('supports simulating events', () => {
    const onClick = sinon.stub();
    const wrapper = render(<button onClick={onClick} />);
    wrapper.simulate('click');
    sinon.assert.called(onClick);
  });

  it('can set the state of the component', done => {
    class Counter extends Component<any, any> {
      constructor(props: any) {
        super(props);
        this.state = { count: 0 };
      }

      render() {
        return <div>{this.state.count}</div>;
      }
    }

    const wrapper = render(<Counter />);
    assert.equal(wrapper.text(), '0');
    wrapper.setState({ count: 2 }, () => {
      assert.equal(wrapper.text(), '2');
      done();
    });
  });

  function componentWithLifecycles(): any {
    class Test extends Component<any> {
      constructor(props: any) {
        super(props);
      }

      render() {
        return <div>Test</div>;
      }
    }
    Test.prototype.shouldComponentUpdate = sinon.stub().returns(true);
    Test.prototype.componentWillReceiveProps = sinon.stub();
    Test.prototype.componentWillMount = sinon.stub();
    Test.prototype.componentDidMount = sinon.stub();
    Test.prototype.componentDidUpdate = sinon.stub();
    Test.prototype.componentWillUnmount = sinon.stub();
    return Test;
  }

  it('invokes lifecycle hooks on render', () => {
    const Test = componentWithLifecycles();
    render(<Test />);
    const shouldCall = ['componentWillMount', 'componentDidMount'];
    const shouldNotCall = [
      'shouldComponentUpdate',
      'componentWillReceiveProps',
      'componentDidUpdate',
      'componentWillUnmount',
    ];
    shouldCall.forEach(method =>
      sinon.assert.calledOnce(Test.prototype[method])
    );
    shouldNotCall.forEach(method =>
      sinon.assert.notCalled(Test.prototype[method])
    );
  });

  it('invokes lifecycle hooks on update', () => {
    const Test = componentWithLifecycles();
    const shouldCall = [
      'componentWillReceiveProps',
      'componentDidUpdate',
      'shouldComponentUpdate',
    ];
    const shouldNotCall = [
      'componentWillMount',
      'componentDidMount',
      'componentWillUnmount',
    ];
    const allMethods = [...shouldCall, ...shouldNotCall];

    const wrapper = render(<Test />);
    allMethods.forEach(method => Test.prototype[method].reset());

    wrapper.setProps({ label: 'foo' });

    shouldCall.forEach(method =>
      sinon.assert.calledOnce(Test.prototype[method])
    );
    shouldNotCall.forEach(method =>
      sinon.assert.notCalled(Test.prototype[method])
    );
  });

  it('invokes lifecycle hooks on unmount', () => {
    const Test = componentWithLifecycles();
    const shouldCall = ['componentWillUnmount'];
    const shouldNotCall = [
      'componentDidMount',
      'componentDidUpdate',
      'componentWillMount',
      'componentWillReceiveProps',
      'shouldComponentUpdate',
    ];
    const allMethods = [...shouldCall, ...shouldNotCall];

    const wrapper = render(<Test />);
    allMethods.forEach(method => Test.prototype[method].reset());

    const unmountCallback = sinon.stub();
    (options as any).unmount = unmountCallback;

    wrapper.unmount();
    sinon.assert.called(unmountCallback);

    shouldCall.forEach(method =>
      sinon.assert.calledOnce(Test.prototype[method])
    );
    shouldNotCall.forEach(method =>
      sinon.assert.notCalled(Test.prototype[method])
    );
  });

  it('supports simulating errors', done => {
    // let lastError = null;

    function Child() {
      return <div>Everything is working</div>;
    }

    class Parent extends Component<any, any> {
      constructor(props: any) {
        super(props);
        this.state = { error: null };
      }

      render() {
        const { error } = this.state;
        if (error) {
          return <div>Something went wrong: ${error.message}</div>;
        }
        return <Child />;
      }

      componentDidCatch(error: Error) {
        //  lastError = error;
      }

      static getDerivedStateFromError(error: Error) {
        return { error };
      }
    }

    const wrapper = render(<Parent />);
    const expectedText = isShallow ? '<Child />' : 'Everything is working';

    // Initial render, we should see the original content.
    assert.equal(wrapper.text(), expectedText);

    // Simulate an error. The placeholder should be shown.
    const child = wrapper.find(Child);
    const err = new Error('Boom');
    child.simulateError(err);
    assert.equal(wrapper.text(), 'Something went wrong: $Boom');
    // This assert fails because Preact does not call `componentDidCatch`
    // if `getDerivedStateFromError` is defined.
    // assert.equal(lastError, err);

    // Reset the error and render again, we should see the original content.
    wrapper.setState({ error: null }, () => {
      wrapper.update();
      assert.equal(wrapper.text(), expectedText);
      done!();
    });
  });

  it('supports simulating events on DOM elements', () => {
    function App() {
      const [count, setCount] = useState(0);

      return (
        <div>
          <div id="count">Count: {count}</div>
          <button type="button" onClick={() => setCount(count + 1)}>
            Increment
          </button>
        </div>
      );
    }

    const wrapper = render(<App />);
    assert.equal(wrapper.find('#count').text(), 'Count: 0');

    wrapper.find('button').simulate('click');
    assert.equal(wrapper.find('#count').text(), 'Count: 1');
  });
}

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

    describe('useRenderToString: true', () => {
      setAdapter(() => new Adapter({ renderToString: preactRenderToString }));

      // Ensure this flag works without a JSDOM environment so tear it down if
      // it exists before running these tests
      let reinitJSDOM = false;
      before(() => {
        if (global.window) {
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
