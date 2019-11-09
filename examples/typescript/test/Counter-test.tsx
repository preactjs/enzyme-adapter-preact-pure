import { expect } from 'chai';
import * as preact from 'preact';
import { mount } from 'enzyme';

import Counter from '../src/Counter';

describe('Counter', () => {
  it('should display initial count', () => {
    const wrapper = mount(<Counter initialCount={5} />);
    expect(wrapper.text()).to.include('Current value: 5');
  });

  it('should render a button', () => {
    const wrapper = mount(<Counter initialCount={5} />);

    expect(
      wrapper.find('button').matchesElement(<button>Increment</button>)
    ).to.equal(true);
  });

  it('should increment after "Increment" button is clicked', () => {
    const wrapper = mount(<Counter initialCount={5} />);

    wrapper.find('button').simulate('click');

    expect(wrapper.text()).to.include('Current value: 6');
  });
});
