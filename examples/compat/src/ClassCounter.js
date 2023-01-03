import { Component, Fragment, h } from 'preact';

export function Button({ onClick, children }) {
  return (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  );
}

export default class ClassCounter extends Component {
  constructor(props, context) {
    super(props, context);
    this.state = { count: props.initialCount };

    this.increment = () => this.setState(({ count }) => ({ count: count + 1 }));
  }

  render() {
    return (
      <Fragment>
        <div>Current value: {this.state.count}</div>
        <Button onClick={this.increment}>Increment</Button>
      </Fragment>
    );
  }
}
