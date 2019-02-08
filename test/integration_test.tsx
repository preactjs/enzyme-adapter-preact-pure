import { mount, configure } from 'enzyme';
import { Component, h } from 'preact';

import { assert } from 'chai';
import * as sinon from 'sinon';

import PreactAdapter from '../src/PreactAdapter';

describe('mount rendering', () => {
  before(() => {
    configure({ adapter: new PreactAdapter() });
  });

  it('renders a simple component', () => {
    function Button({ label }: any) {
      return <button>{label}</button>;
    }
    const wrapper = mount(<Button label="Click me" />);
    assert.ok(wrapper.find('button'));
  });

  it('supports simulating events', () => {
    const onClick = sinon.stub();
    const wrapper = mount(<button onClick={onClick} />);
    wrapper.simulate('click');
    sinon.assert.called(onClick);
  });

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

    const wrapper = mount(<List />);
    const items = wrapper.find('ul > ListItem');
    assert.equal(items.length, 2);
  });

  it('can return text content', () => {
    function Button({ label }: any) {
      return <button>{label}</button>;
    }

    const wrapper = mount(<Button label="Click me" />);
    assert.equal(wrapper.text(), 'Click me');
  });

  it('can return HTML content', () => {
    function Button({ label }: any) {
      return <button>{label}</button>;
    }

    const wrapper = mount(<Button label="Click me" />);
    assert.equal(wrapper.html(), '<button>Click me</button>');
  });

  it('can set the props of the component', () => {
    const Button = ({ label }: any) => <button>{label}</button>;
    const wrapper = mount(<Button label="first" />);
    assert.equal(wrapper.text(), 'first');
    debugger;
    wrapper.setProps({ label: 'second' });
    assert.equal(wrapper.text(), 'second');
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

    const wrapper = mount(<Counter />);
    assert.equal(wrapper.text(), '0');
    wrapper.setState({ count: 2 }, () => {
      assert.equal(wrapper.text(), '2');
      done();
    });
  });
});
