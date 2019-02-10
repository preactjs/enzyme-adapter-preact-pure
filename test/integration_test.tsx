import { JSXElement, configure, shallow, mount, render } from 'enzyme';
import { Component, h } from 'preact';

import { assert } from 'chai';
import * as sinon from 'sinon';

import PreactAdapter from '../src/PreactAdapter';

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
    const item = wrapper.find('ListItem');
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
}

describe('integration tests', () => {
  before(() => {
    configure({ adapter: new PreactAdapter() });
  });

  describe('"mount" rendering', () => {
    addStaticTests(mount);
    addInteractiveTests(mount);
  });

  describe('"shallow" rendering', () => {
    const shallowRender = (el: JSXElement) =>
      shallow(el, { disableLifecycleMethods: true });
    addStaticTests(shallowRender);
    addInteractiveTests(shallowRender);

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

      const wrapper = shallowRender(<Parent />);

      // `text()` outputs placeholders to represent un-rendered child components
      // in shallow rendering.
      assert.equal(wrapper.text(), 'One<Child />Three<NestedChild />');
    });
  });

  describe('"string" rendering', () => {
    addStaticTests(render);
  });
});
