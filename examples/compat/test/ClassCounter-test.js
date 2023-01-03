/* global describe, it */
import { expect } from 'chai';
import { h } from 'preact';
import { shallow } from 'enzyme';

import ClassCounter, { Button } from '../src/ClassCounter';

describe('ClassCounter', () => {
  it('should display initial count', () => {
    const wrapper = shallow(<ClassCounter initialCount={5} />);
    expect(wrapper.html()).to.include('Current value: 5');
  });

  it('should increment after "Increment" button is clicked', () => {
    const wrapper = shallow(<ClassCounter initialCount={5} />);

    wrapper.find(Button).simulate('click');
    expect(wrapper.html()).to.include('Current value: 6');

    wrapper.find({ children: 'Increment' }).simulate('click');
    expect(wrapper.html()).to.include('Current value: 7');
  });

  it('should update text when state changes', () => {
    const wrapper = shallow(<ClassCounter initialCount={5} />);
    expect(wrapper.html()).to.include('Current value: 5');

    wrapper.setState({ count: 10 });
    expect(wrapper.html()).to.include('Current value: ');
  });
});
