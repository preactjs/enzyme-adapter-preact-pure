import { assert } from 'chai';
import type { CommonWrapper } from 'enzyme';
import enzyme from 'enzyme';
import * as preact from 'preact';
import { useState } from 'preact/hooks';
import type { ReactElement } from 'react';
import sinon from 'sinon';

import Adapter from '../src/Adapter.js';

const { configure, shallow, mount, render: renderToString } = enzyme;
const { Component, Fragment, options } = preact;

export function normalizeDebugMessage(message: string) {
  return message.replace(/\s{2,}/g, '').replace(/>\s/g, '>');
}

export function debugWrappedShallowComponent(wrapper: enzyme.ShallowWrapper) {
  return normalizeDebugMessage(wrapper.getWrappingComponent().debug());
}

export function WrappingComponent({
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
export function addStaticTests(render: (el: ReactElement) => Wrapper) {
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

    const wrapper = render(<Button label="Click me" />);
    assert.equal(
      wrapper.html(),
      isStringRenderer ? 'Click me' : '<button>Click me</button>'
    );
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
export function addInteractiveTests(render: typeof mount) {
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

export const createDefaultAdapter = () => new Adapter();
export function setAdapter(createNewAdapter: () => Adapter) {
  beforeEach(() => {
    configure({ adapter: createNewAdapter() });
  });

  afterEach(() => {
    configure({ adapter: createDefaultAdapter() });
  });
}
