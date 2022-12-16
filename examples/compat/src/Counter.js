import { Fragment, h } from 'preact';
import { useState } from 'preact/hooks';

export function Button({ onClick, children }) {
  return (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  );
}

export default function Counter({ initialCount }) {
  const [count, setCount] = useState(initialCount);
  const increment = () => setCount(count + 1);

  return (
    <Fragment>
      <div>Current value: {count}</div>
      <Button onClick={increment}>Increment</Button>
    </Fragment>
  );
}
