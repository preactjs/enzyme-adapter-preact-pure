import * as preact from 'preact';
import { useState } from 'preact/hooks';

export default function Counter({ initialCount } : { initialCount: number }) {
  const [count, setCount] = useState(initialCount);
  const increment = () => setCount(count + 1);

  return (
    <div>
      Current value: {count}
      <button onClick={increment}>Increment</button>
    </div>
  );
}
