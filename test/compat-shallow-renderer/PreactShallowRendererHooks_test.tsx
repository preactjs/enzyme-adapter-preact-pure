/**
 * This file is largely taken and adapted from react-shallow-renderer, which is
 * copyrighted to Facebook and licensed under the MIT License, found at the link
 * below:
 *
 * https://github.com/enzymejs/react-shallow-renderer/blob/802c735ee53bf2d965797760698cacbd46088f66/LICENSE
 */

import type { VNode } from 'preact';
import * as preact from 'preact/compat';
import type { StateUpdater } from 'preact/compat';
import PreactShallowRenderer from '../../src/compat-shallow-renderer/PreactShallowRenderer.js';
import { expect, installVNodeTestHook } from './utils.js';

const {
  useState,
  useReducer,
  useEffect,
  useLayoutEffect,
  useInsertionEffect,
  useMemo,
  useId,
  useContext,
  useRef,
  useSyncExternalStore,
  createContext,
  forwardRef,
} = preact;
const createRenderer = PreactShallowRenderer.createRenderer;

describe('PreactShallowRenderer with hooks', () => {
  installVNodeTestHook();

  it('should work with useState', () => {
    function SomeComponent({ defaultName }: { defaultName: string }) {
      const [name] = useState(defaultName);

      return (
        <div>
          <p>
            Your name is: <span>{name}</span>
          </p>
        </div>
      );
    }

    const shallowRenderer = createRenderer();
    let result = shallowRenderer.render(
      <SomeComponent defaultName={'Dominic'} />
    );

    expect(result).toEqual(
      <div>
        <p>
          Your name is: <span>Dominic</span>
        </p>
      </div>
    );

    result = shallowRenderer.render(
      <SomeComponent defaultName={'Should not use this name'} />
    );

    expect(result).toEqual(
      <div>
        <p>
          Your name is: <span>Dominic</span>
        </p>
      </div>
    );
  });

  it('should work with updating a value from useState', () => {
    function SomeComponent({ defaultName }: { defaultName: string }) {
      const [name, updateName] = useState(defaultName);

      if (name !== 'Dan') {
        updateName('Dan');
      }

      return (
        <div>
          <p>
            Your name is: <span>{name}</span>
          </p>
        </div>
      );
    }

    const shallowRenderer = createRenderer();
    const result = shallowRenderer.render(
      <SomeComponent defaultName={'Dominic'} />
    );

    expect(result).toEqual(
      <div>
        <p>
          Your name is: <span>Dan</span>
        </p>
      </div>
    );
  });

  it('should work with updating a derived value from useState', () => {
    let _updateName: StateUpdater<string> = null as any;

    function SomeComponent({ defaultName }: { defaultName: string }) {
      const [name, updateName] = useState(defaultName);
      const [prevName, updatePrevName] = useState(defaultName);
      const [letter, updateLetter] = useState(name[0]);

      _updateName = updateName;

      if (name !== prevName) {
        updatePrevName(name);
        updateLetter(name[0]);
      }

      return (
        <div>
          <p>
            Your name is: <span>{name + ' (' + letter + ')'}</span>
          </p>
        </div>
      );
    }

    const shallowRenderer = createRenderer();
    let result = shallowRenderer.render(
      <SomeComponent defaultName={'Sophie'} />
    );
    expect(result).toEqual(
      <div>
        <p>
          Your name is: <span>Sophie (S)</span>
        </p>
      </div>
    );

    result = shallowRenderer.render(<SomeComponent defaultName={'Dan'} />);
    expect(result).toEqual(
      <div>
        <p>
          Your name is: <span>Sophie (S)</span>
        </p>
      </div>
    );

    _updateName('Dan');
    expect(shallowRenderer.getRenderOutput()).toEqual(
      <div>
        <p>
          Your name is: <span>Dan (D)</span>
        </p>
      </div>
    );
  });

  it('should work with useReducer', () => {
    function reducer(
      state: { count: number },
      action: { type: 'increment' | 'decrement' }
    ) {
      switch (action.type) {
        case 'increment':
          return { count: state.count + 1 };
        case 'decrement':
          return { count: state.count - 1 };
      }
    }

    function SomeComponent(props: { initialCount: number }) {
      const [state] = useReducer(reducer, props, p => ({
        count: p.initialCount,
      }));

      return (
        <div>
          <p>
            The counter is at: <span>{state.count.toString()}</span>
          </p>
        </div>
      );
    }

    const shallowRenderer = createRenderer();
    let result = shallowRenderer.render(<SomeComponent initialCount={0} />);

    expect(result).toEqual(
      <div>
        <p>
          The counter is at: <span>0</span>
        </p>
      </div>
    );

    result = shallowRenderer.render(<SomeComponent initialCount={10} />);

    expect(result).toEqual(
      <div>
        <p>
          The counter is at: <span>0</span>
        </p>
      </div>
    );
  });

  it('should work with a dispatched state change for a useReducer', () => {
    function reducer(
      state: { count: number },
      action: { type: 'increment' | 'decrement' }
    ) {
      switch (action.type) {
        case 'increment':
          return { count: state.count + 1 };
        case 'decrement':
          return { count: state.count - 1 };
      }
    }

    function SomeComponent(props: { initialCount: number }) {
      const [state, dispatch] = useReducer(reducer, props, p => ({
        count: p.initialCount,
      }));

      if (state.count === 0) {
        dispatch({ type: 'increment' });
      }

      return (
        <div>
          <p>
            The counter is at: <span>{state.count.toString()}</span>
          </p>
        </div>
      );
    }

    const shallowRenderer = createRenderer();
    const result = shallowRenderer.render(<SomeComponent initialCount={0} />);

    expect(result).toEqual(
      <div>
        <p>
          The counter is at: <span>1</span>
        </p>
      </div>
    );
  });

  it('should not trigger effects', () => {
    const effectsCalled: string[] = [];

    function SomeComponent({ defaultName }: { defaultName?: string }) {
      useEffect(() => {
        effectsCalled.push('useEffect');
      });

      useInsertionEffect(() => {
        effectsCalled.push('useInsertionEffect');
      });

      useLayoutEffect(() => {
        effectsCalled.push('useLayoutEffect');
      });

      return <div>Hello world</div>;
    }

    const shallowRenderer = createRenderer();
    shallowRenderer.render(<SomeComponent />);

    expect(effectsCalled).toEqual([]);
  });

  it('should work with useRef', () => {
    function SomeComponent() {
      const randomNumberRef = useRef({ number: Math.random() });

      return (
        <div>
          <p>The random number is: {randomNumberRef.current.number}</p>
        </div>
      );
    }

    const shallowRenderer = createRenderer();
    const firstResult = shallowRenderer.render(<SomeComponent />);
    const secondResult = shallowRenderer.render(<SomeComponent />);

    expect(firstResult).toEqual(secondResult);
  });

  it('should work with useMemo', () => {
    function SomeComponent() {
      const randomNumber = useMemo(() => {
        return { number: Math.random() };
      }, []);

      return (
        <div>
          <p>The random number is: {randomNumber.number}</p>
        </div>
      );
    }

    const shallowRenderer = createRenderer();
    const firstResult = shallowRenderer.render(<SomeComponent />);
    const secondResult = shallowRenderer.render(<SomeComponent />);

    expect(firstResult).toEqual(secondResult);
  });

  it('should work with useContext', () => {
    const SomeContext = createContext('default');

    function SomeComponent() {
      const value = useContext(SomeContext);

      return (
        <div>
          <p>{value}</p>
        </div>
      );
    }

    const shallowRenderer = createRenderer();
    const result = shallowRenderer.render(<SomeComponent />);

    expect(result).toEqual(
      <div>
        <p>default</p>
      </div>
    );
  });

  it('should not leak state when component type changes', () => {
    function SomeComponent({ defaultName }: { defaultName: string }) {
      const [name] = useState(defaultName);

      return (
        <div>
          <p>
            Your name is: <span>{name}</span>
          </p>
        </div>
      );
    }

    function SomeOtherComponent({ defaultName }: { defaultName: string }) {
      const [name] = useState(defaultName);

      return (
        <div>
          <p>
            Your name is: <span>{name}</span>
          </p>
        </div>
      );
    }

    const shallowRenderer = createRenderer();
    let result = shallowRenderer.render(
      <SomeComponent defaultName={'Dominic'} />
    );
    expect(result).toEqual(
      <div>
        <p>
          Your name is: <span>Dominic</span>
        </p>
      </div>
    );

    result = shallowRenderer.render(<SomeOtherComponent defaultName={'Dan'} />);
    expect(result).toEqual(
      <div>
        <p>
          Your name is: <span>Dan</span>
        </p>
      </div>
    );
  });

  it('should work with with forwardRef + any hook', () => {
    const SomeComponent = forwardRef((props: any, ref: any) => {
      const randomNumberRef = useRef({ number: Math.random() });

      return (
        <div ref={ref}>
          <p>The random number is: {randomNumberRef.current.number}</p>
        </div>
      );
    });

    const shallowRenderer = createRenderer();
    const firstResult = shallowRenderer.render(<SomeComponent />);
    const secondResult = shallowRenderer.render(<SomeComponent />);

    expect(firstResult).toEqual(secondResult);
  });

  it('should update a value from useState outside the render', () => {
    let _dispatch: (...args: any[]) => void = null as any;

    function SomeComponent({ defaultName }: { defaultName: string }) {
      const [count, dispatch] = useReducer(
        (s: number, a: string) => (a === 'inc' ? s + 1 : s),
        0
      );
      const [name, updateName] = useState(defaultName);
      _dispatch = () => dispatch('inc');

      return (
        <div onClick={() => updateName('Dan')}>
          <p>
            Your name is: <span>{name}</span> ({count})
          </p>
        </div>
      );
    }

    const shallowRenderer = createRenderer();
    const element = <SomeComponent defaultName={'Dominic'} />;
    const result = shallowRenderer.render(element) as VNode<any>;
    expect(result.props.children).toEqual(
      <p>
        Your name is: <span>Dominic</span> ({0})
      </p>
    );

    result.props.onClick();
    let updated = shallowRenderer.render(element) as VNode<any>;
    expect(updated.props.children).toEqual(
      <p>
        Your name is: <span>Dan</span> ({0})
      </p>
    );

    _dispatch('foo');
    updated = shallowRenderer.render(element) as VNode<any>;
    expect(updated.props.children).toEqual(
      <p>
        Your name is: <span>Dan</span> ({1})
      </p>
    );

    _dispatch('inc');
    updated = shallowRenderer.render(element) as VNode<any>;
    expect(updated.props.children).toEqual(
      <p>
        Your name is: <span>Dan</span> ({2})
      </p>
    );
  });

  it('should ignore a foreign update outside the render', () => {
    let _updateCountForFirstRender: StateUpdater<number> = null as any;

    function SomeComponent() {
      const [count, updateCount] = useState(0);
      if (!_updateCountForFirstRender) {
        _updateCountForFirstRender = updateCount;
      }
      return count as any;
    }

    const shallowRenderer = createRenderer();
    const element = <SomeComponent />;
    let result = shallowRenderer.render(element);
    expect(result).toEqual(0);
    _updateCountForFirstRender(1);
    result = shallowRenderer.render(element);
    expect(result).toEqual(1);

    shallowRenderer.unmount();
    result = shallowRenderer.render(element);
    expect(result).toEqual(0);
    _updateCountForFirstRender(1); // Should be ignored.
    result = shallowRenderer.render(element);
    expect(result).toEqual(0);
  });

  it('should not forget render phase updates', () => {
    let _updateCount: StateUpdater<number> = null as any;

    function SomeComponent() {
      const [count, updateCount] = useState(0);
      _updateCount = updateCount;
      if (count < 5) {
        updateCount(x => x + 1);
      }
      return count as any;
    }

    const shallowRenderer = createRenderer();
    const element = <SomeComponent />;
    let result = shallowRenderer.render(element);
    expect(result).toEqual(5);

    _updateCount(10);
    result = shallowRenderer.render(element);
    expect(result).toEqual(10);

    _updateCount(x => x + 1);
    result = shallowRenderer.render(element);
    expect(result).toEqual(11);

    _updateCount(x => x - 10);
    result = shallowRenderer.render(element);
    expect(result).toEqual(5);
  });

  it('should work with useId', () => {
    function SomeComponent({ defaultName }: { defaultName?: string }) {
      const id = useId();
      const id2 = useId();

      return (
        <div>
          <div id={id} />
          <div id={id2} />
        </div>
      );
    }

    const shallowRenderer = createRenderer();
    let result = shallowRenderer.render(<SomeComponent />);

    expect(result).toEqual(
      <div>
        <div id="P01" />
        <div id="P02" />
      </div>
    );

    result = shallowRenderer.render(<SomeComponent />);

    expect(result).toEqual(
      <div>
        <div id="P01" />
        <div id="P02" />
      </div>
    );
  });

  it('should work with useSyncExternalStore', () => {
    function createExternalStore(initialState: string) {
      const listeners: Set<() => void> = new Set();
      let currentState = initialState;
      return {
        set(text: string) {
          currentState = text;
          listeners.forEach(listener => listener());
        },
        subscribe(listener: () => void) {
          listeners.add(listener);
          return () => listeners.delete(listener);
        },
        getState() {
          return currentState;
        },
        getSubscriberCount() {
          return listeners.size;
        },
      };
    }

    const store = createExternalStore('hello');

    function SomeComponent() {
      const value = useSyncExternalStore(store.subscribe, store.getState);
      return <div>{value}</div>;
    }

    const shallowRenderer = createRenderer();
    let result = shallowRenderer.render(<SomeComponent />);
    expect(result).toEqual(<div>hello</div>);
    store.set('goodbye');
    result = shallowRenderer.render(<SomeComponent />);
    expect(result).toEqual(<div>goodbye</div>);
  });
});
