import { Component, h } from 'preact';

export default class Counter extends Component {
  constructor(props) {
    super(props);

    this.state = {
      count: props.initialCount,
    };
  };

  render() {
    const increment = () => this.setState(({ count }) => ({
      count: count + 1,
    }));

    return (
      <div>
        Current value: {this.state.count}
        <button onClick={increment}>Increment</button>
      </div>
    );
  }
}
