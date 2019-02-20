import { configure, shallow, mount, render as renderToString } from 'enzyme';
import { Component, Fragment, h, options } from 'preact';

import { assert } from 'chai';
import * as sinon from 'sinon';

import PreactAdapter from '../src/PreactAdapter';
import { isPreact10 } from '../src/util';

function itIf(cond: () => boolean, description: string, fn: () => any) {
  const itFn = cond() ? it : it.skip;
  itFn(description, fn);
}

/**
 * Register tests for static and interactive rendering modes.
 */
function addStaticTests(render: typeof mount) {
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

  if (render !== renderToString) {
    it('can find DOM nodes by class name', () => {
      function Widget() {
        return <div class="widget">Test</div>;
      }
      const wrapper = render(<Widget />);
      assert.equal(wrapper.find('.widget').length, 1);
    });
  }

  if (render !== renderToString) {
    itIf(isPreact10, 'returns contents of fragments', () => {
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
      const wrapper = render(el)
        .find('div')
        .children();
      assert.equal(wrapper.length, 3);
    });
  }
}

/**
 * Register tests for interactive rendering modes (full + shallow rendering).
 */
function addInteractiveTests(render: typeof mount) {
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

    (options as any).beforeUnmount = sinon.stub();
    wrapper.unmount();
    sinon.assert.called((options as any).beforeUnmount);

    shouldCall.forEach(method =>
      sinon.assert.calledOnce(Test.prototype[method])
    );
    shouldNotCall.forEach(method =>
      sinon.assert.notCalled(Test.prototype[method])
    );
  });

  itIf(isPreact10, 'supports simulating errors', () => {
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
    const expectedText =
      render === shallow ? '<Child />' : 'Everything is working';

    // Initial render, we should see the original content.
    assert.equal(wrapper.text(), expectedText);

    // Simulate an error. The placeholder should be shown.
    const child = wrapper.find(Child);
    const err = new Error('Boom');
    child.simulateError(err);
    assert.equal(wrapper.text(), 'Something went wrong: $Boom');
    // This assert fails because Preact 10 does not call `componentDidCatch`
    // if `getDerivedStateFromError` is defined.
    // assert.equal(lastError, err);

    // Reset the error and render again, we should see the original content.
    wrapper.setState({ error: null });
    assert.equal(wrapper.text(), expectedText);
  });
}

describe('integration tests', () => {
  before(() => {
    configure({ adapter: new PreactAdapter() });
  });

  describe('"mount" rendering', () => {
    addStaticTests(mount);
    addInteractiveTests(mount);

    it('supports retrieving elements', () => {
      // Test workaround for bug where `PreactAdapter.nodeToElement` is called
      // with undefined `this` by `ReactWrapper#get`.
      const wrapper = mount(
        <div>
          test<span>bar</span>
        </div>
      );
      const div = wrapper.get(0);
      assert.deepEqual(div.type, 'div');
    });
  });

  describe('"shallow" rendering', () => {
    addStaticTests(shallow);
    addInteractiveTests(shallow);

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
      const output = wrapper.debug().replace(/\s+/g, '');
      assert.equal(output, '<div><Component/></div>');
    });
  });

  describe('"string" rendering', () => {
    addStaticTests(renderToString);
  });
});
