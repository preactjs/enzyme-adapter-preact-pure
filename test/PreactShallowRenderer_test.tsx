/**
 * Largely taken and adapted from react-shallow-renderer, which is copyrighted
 * to Facebook and licensed under the MIT License, found a the link below:
 * https://github.com/enzymejs/react-shallow-renderer/blob/802c735ee53bf2d965797760698cacbd46088f66/LICENSE
 */

import { assert } from 'chai';
import * as preact from 'preact/compat';
import type { VNode } from 'preact';
import { options } from 'preact';
import * as PropTypes from 'prop-types';
import sinon from 'sinon';

import PreactShallowRenderer from '../src/PreactShallowRenderer.js';

const { Component, PureComponent, createElement } = preact;
const createRenderer = PreactShallowRenderer.createRenderer;

// These tests are from react-shallow-renderer which uses Jest for testing, so
// here is a lightweight adapter around `chai` to give it the same API as Jest's
// `expect` so we don't have to rewrite all the `expect` statements to `assert`
function expect<T>(actual: T) {
  return {
    toBe(expected: T) {
      assert.equal(actual, expected);
    },
    toEqual(expected: T) {
      assert.deepEqual(actual, expected);
    },
    toThrowError(expected: string) {
      assert.throws(actual as any, expected);
    },
    toBeCalled() {
      sinon.assert.called(actual as any);
    },
  };
}

describe.only('PreactShallowRenderer', () => {
  let prevVNodeHook: ((vnode: VNode) => void) | undefined;

  before(() => {
    prevVNodeHook = options.vnode;
    options.vnode = vnode => {
      if (prevVNodeHook) {
        prevVNodeHook(vnode);
      }

      // Override the vnodeId (`__v`) to NaN so that we can compare VNodes in
      // tests and verify expected VNode output. We choose NaN here because it
      // successfully threads the desired behavior we want for these tests.
      //
      // The Preact diff uses `__v` to shortcut diffing VNodes that haven't
      // changed since creation (it treats VNodes as immutable). So when Preact
      // checks if `oldVNode.__v == newVNode.__v`, setting `__v` to NaN will
      // always return false, per the rules of JavaScript (NaN !== NaN in JS).
      //
      // However, assert.deepEqual specially handles NaN such that two NaNs are
      // treated as equal, allowing us to do things like `assert.equal(<div />,
      // <div />)`. In this case both `<div/>` elements will have a `__v` of NaN
      // so `assert.deepEqual` will see those properties as the same.
      //
      // In summary, using `NaN`, Preact will see the VNodes as different and
      // diff them normally (it won't shortcut it), but assert.deepEqual will
      // treat them as the same.
      //
      // @ts-ignore
      vnode.__v = NaN;
    };
  });

  after(() => {
    options.vnode = prevVNodeHook;
  });

  it('should call all of the legacy lifecycle hooks', () => {
    const logs: string[] = [];
    const logger = (message: string) => () => {
      logs.push(message);
      return true;
    };

    class SomeComponent extends Component<{ foo?: number }> {
      UNSAFE_componentWillMount = logger('componentWillMount');
      componentDidMount = logger('componentDidMount');
      UNSAFE_componentWillReceiveProps = logger('componentWillReceiveProps');
      shouldComponentUpdate = logger('shouldComponentUpdate');
      UNSAFE_componentWillUpdate = logger('componentWillUpdate');
      componentDidUpdate = logger('componentDidUpdate');
      componentWillUnmount = logger('componentWillUnmount');
      render() {
        return <div />;
      }
    }

    const shallowRenderer = createRenderer();
    shallowRenderer.render(<SomeComponent foo={1} />);

    // Calling cDU might lead to problems with host component references.
    // Since our components aren't really mounted, refs won't be available.
    expect(logs).toEqual(['componentWillMount']);

    logs.splice(0);

    const instance = shallowRenderer.getMountedInstance() as SomeComponent;
    instance.setState({});

    expect(logs).toEqual(['shouldComponentUpdate', 'componentWillUpdate']);

    logs.splice(0);

    shallowRenderer.render(<SomeComponent foo={2} />);

    // The previous shallow renderer did not trigger cDU for props changes.
    expect(logs).toEqual([
      'componentWillReceiveProps',
      'shouldComponentUpdate',
      'componentWillUpdate',
    ]);
  });

  it('should call all of the new lifecycle hooks', () => {
    const logs: string[] = [];
    const logger = (message: string) => () => {
      logs.push(message);
      return true;
    };

    class SomeComponent extends Component<{ foo?: number }> {
      state = {};
      static getDerivedStateFromProps = () => {
        logger('getDerivedStateFromProps')();
        return null;
      };
      componentDidMount = logger('componentDidMount');
      shouldComponentUpdate = logger('shouldComponentUpdate');
      componentDidUpdate = logger('componentDidUpdate');
      componentWillUnmount = logger('componentWillUnmount');
      render() {
        return <div />;
      }
    }

    const shallowRenderer = createRenderer();
    shallowRenderer.render(<SomeComponent foo={1} />);

    // Calling cDU might lead to problems with host component references.
    // Since our components aren't really mounted, refs won't be available.
    expect(logs).toEqual(['getDerivedStateFromProps']);

    logs.splice(0);

    const instance = shallowRenderer.getMountedInstance() as SomeComponent;
    instance.setState({});

    expect(logs).toEqual(['getDerivedStateFromProps', 'shouldComponentUpdate']);

    logs.splice(0);

    shallowRenderer.render(<SomeComponent foo={2} />);

    // The previous shallow renderer did not trigger cDU for props changes.
    expect(logs).toEqual(['getDerivedStateFromProps', 'shouldComponentUpdate']);
  });

  it('should not invoke deprecated lifecycles (cWM/cWRP/cWU) if new static gDSFP is present', () => {
    class SomeComponent extends Component {
      state = {};
      static getDerivedStateFromProps() {
        return null;
      }
      componentWillMount() {
        throw Error('unexpected componentWillMount');
      }
      componentWillReceiveProps() {
        throw Error('unexpected componentWillReceiveProps');
      }
      componentWillUpdate() {
        throw Error('unexpected componentWillUpdate');
      }
      render() {
        return null;
      }
    }

    const shallowRenderer = createRenderer();
    shallowRenderer.render(<SomeComponent />);
  });

  // TODO: Make a note that preact does not do this
  it.skip('should not invoke deprecated lifecycles (cWM/cWRP/cWU) if new getSnapshotBeforeUpdate is present', () => {
    class SomeComponent extends Component<{ value: number }> {
      getSnapshotBeforeUpdate() {
        return null;
      }
      componentWillMount() {
        throw Error('unexpected componentWillMount');
      }
      componentWillReceiveProps() {
        throw Error('unexpected componentWillReceiveProps');
      }
      componentWillUpdate() {
        throw Error('unexpected componentWillUpdate');
      }
      render() {
        return null;
      }
    }

    const shallowRenderer = createRenderer();
    shallowRenderer.render(<SomeComponent value={1} />);
    shallowRenderer.render(<SomeComponent value={2} />);
  });

  it('should not call getSnapshotBeforeUpdate or componentDidUpdate when updating since refs wont exist', () => {
    class SomeComponent extends Component<{ value: number }> {
      getSnapshotBeforeUpdate() {
        throw Error('unexpected');
      }
      componentDidUpdate() {
        throw Error('unexpected');
      }
      render() {
        return null;
      }
    }

    const shallowRenderer = createRenderer();
    shallowRenderer.render(<SomeComponent value={1} />);
    shallowRenderer.render(<SomeComponent value={2} />);
  });

  it('should only render 1 level deep', () => {
    function Parent() {
      return (
        <div>
          {/* @ts-ignore */}
          <Child />
        </div>
      );
    }
    function Child() {
      throw Error('This component should not render');
    }

    const shallowRenderer = createRenderer();
    shallowRenderer.render(createElement(Parent, null));
  });

  it('should have shallow rendering', () => {
    class SomeComponent extends Component {
      render() {
        return (
          <div>
            <span className="child1" />
            <span className="child2" />
          </div>
        );
      }
    }

    const shallowRenderer = createRenderer();
    const result = shallowRenderer.render(<SomeComponent />) as VNode<any>;

    expect(result.type).toBe('div');
    expect(result.props.children).toEqual([
      <span className="child1" />,
      <span className="child2" />,
    ]);
  });

  it('should handle ForwardRef', () => {
    const testRef = preact.createRef();
    const SomeComponent = preact.forwardRef((props, ref) => {
      expect(ref).toEqual(testRef);
      return (
        <div>
          <span className="child1" />
          <span className="child2" />
        </div>
      );
    });

    const shallowRenderer = createRenderer();
    const result = shallowRenderer.render(
      <SomeComponent ref={testRef} />
    ) as VNode;

    expect(result.type).toBe('div');
    expect(result.props.children).toEqual([
      <span className="child1" />,
      <span className="child2" />,
    ]);
  });

  // Note: Preact doesn't have a Profiler
  it.skip('should handle Profiler', () => {
    // To make TS happy;
    const Profiler = (props: any) => props.children;

    class SomeComponent extends Component {
      render() {
        return (
          <Profiler id="test" onRender={() => {}}>
            <div>
              <span className="child1" />
              <span className="child2" />
            </div>
          </Profiler>
        );
      }
    }

    const shallowRenderer = createRenderer();
    const result = shallowRenderer.render(<SomeComponent />) as VNode;

    expect(result.type).toBe(Profiler);
    expect(result.props.children).toEqual(
      <div>
        <span className="child1" />
        <span className="child2" />
      </div>
    );
  });

  it('should enable shouldComponentUpdate to prevent a re-render', () => {
    type SimpleState = { update: boolean };

    let renderCounter = 0;
    class SimpleComponent extends Component<{}, SimpleState> {
      state = { update: false };
      shouldComponentUpdate(nextProps: SimpleState, nextState: SimpleState) {
        return this.state.update !== nextState.update;
      }
      render() {
        renderCounter++;
        return <div>{`${renderCounter}`}</div>;
      }
    }

    const shallowRenderer = createRenderer();
    shallowRenderer.render(<SimpleComponent />);
    expect(shallowRenderer.getRenderOutput()).toEqual(<div>1</div>);

    const instance = shallowRenderer.getMountedInstance()!;
    instance.setState({ update: false });
    expect(shallowRenderer.getRenderOutput()).toEqual(<div>1</div>);

    instance.setState({ update: true });
    expect(shallowRenderer.getRenderOutput()).toEqual(<div>2</div>);
  });

  it('should enable PureComponent to prevent a re-render', () => {
    let renderCounter = 0;
    class SimpleComponent extends PureComponent {
      state = { update: false };
      render() {
        renderCounter++;
        return <div>{`${renderCounter}`}</div>;
      }
    }

    const shallowRenderer = createRenderer();
    shallowRenderer.render(<SimpleComponent />);
    expect(shallowRenderer.getRenderOutput()).toEqual(<div>1</div>);

    const instance = shallowRenderer.getMountedInstance()!;
    instance.setState({ update: false });
    expect(shallowRenderer.getRenderOutput()).toEqual(<div>1</div>);

    instance.setState({ update: true });
    expect(shallowRenderer.getRenderOutput()).toEqual(<div>2</div>);
  });

  it('should not run shouldComponentUpdate during forced update', () => {
    type SimpleState = { count: number };

    let scuCounter = 0;
    class SimpleComponent extends Component<{}, SimpleState> {
      state = { count: 1 };
      shouldComponentUpdate() {
        scuCounter++;
        return false;
      }
      render() {
        return <div>{`${this.state.count}`}</div>;
      }
    }

    const shallowRenderer = createRenderer();
    shallowRenderer.render(<SimpleComponent />);
    expect(scuCounter).toEqual(0);
    expect(shallowRenderer.getRenderOutput()).toEqual(<div>1</div>);

    // Force update the initial state. sCU should not fire.
    const instance = shallowRenderer.getMountedInstance()!;
    instance.forceUpdate();
    expect(scuCounter).toEqual(0);
    expect(shallowRenderer.getRenderOutput()).toEqual(<div>1</div>);

    // Setting state updates the instance, but doesn't re-render
    // because sCU returned false.
    instance.setState(state => ({ count: state.count + 1 }));
    expect(scuCounter).toEqual(1);
    expect(instance.state.count).toEqual(2);
    expect(shallowRenderer.getRenderOutput()).toEqual(<div>1</div>);

    // A force update updates the render output, but doesn't call sCU.
    instance.forceUpdate();
    expect(scuCounter).toEqual(1);
    expect(instance.state.count).toEqual(2);
    expect(shallowRenderer.getRenderOutput()).toEqual(<div>2</div>);
  });

  it('should rerender when calling forceUpdate', () => {
    let renderCounter = 0;
    class SimpleComponent extends Component {
      render() {
        renderCounter += 1;
        return <div />;
      }
    }

    const shallowRenderer = createRenderer();
    shallowRenderer.render(<SimpleComponent />);
    expect(renderCounter).toEqual(1);

    const instance = shallowRenderer.getMountedInstance()!;
    instance.forceUpdate();
    expect(renderCounter).toEqual(2);
  });

  it('should shallow render a function component', () => {
    function SomeComponent(props: { foo: string }, context: any) {
      return (
        <div>
          <div>{props.foo}</div>
          <div>{context.bar}</div>
          <span className="child1" />
          <span className="child2" />
        </div>
      );
    }
    SomeComponent.contextTypes = {
      bar: PropTypes.string,
    };

    const shallowRenderer = createRenderer();
    const result = shallowRenderer.render(<SomeComponent foo={'FOO'} />, {
      bar: 'BAR',
    }) as VNode;

    expect(result.type).toBe('div');
    expect(result.props.children).toEqual([
      <div>FOO</div>,
      <div>BAR</div>,
      <span className="child1" />,
      <span className="child2" />,
    ]);
  });

  it('should shallow render a component returning strings directly from render', () => {
    const Text = ({ value }: { value: string }) => value;

    const shallowRenderer = createRenderer();
    // @ts-ignore Components can return strings
    const result = shallowRenderer.render(<Text value="foo" />);
    expect(result).toEqual('foo');
  });

  it('should shallow render a component returning numbers directly from render', () => {
    const Text = ({ value }: { value: number }) => value;

    const shallowRenderer = createRenderer();
    // @ts-ignore Components can return numbers
    const result = shallowRenderer.render(<Text value={10} />);
    expect(result).toEqual(10);
  });

  it('should shallow render a fragment', () => {
    class SomeComponent extends Component {
      render() {
        return <div />;
      }
    }
    class ArrayReturn extends Component {
      render() {
        return [<div key="a" />, <span key="b" />, <SomeComponent />];
      }
    }
    const shallowRenderer = createRenderer();
    const result = shallowRenderer.render(<ArrayReturn />);
    expect(result).toEqual([
      <div key="a" />,
      <span key="b" />,
      <SomeComponent />,
    ]);
  });

  it('should shallow render a React.fragment', () => {
    class SomeComponent extends Component {
      render() {
        return <div />;
      }
    }
    class Fragment extends Component {
      render() {
        return (
          <>
            <div />
            <span />
            <SomeComponent />
          </>
        );
      }
    }
    const shallowRenderer = createRenderer();
    const result = shallowRenderer.render(<Fragment />);
    expect(result).toEqual(
      <>
        <div />
        <span />
        <SomeComponent />
      </>
    );
  });

  it('should throw for invalid elements', () => {
    class SomeComponent extends Component {
      render() {
        return <div />;
      }
    }

    const shallowRenderer = createRenderer();
    expect(() => shallowRenderer.render(SomeComponent as any)).toThrowError(
      'PreactShallowRenderer render(): Invalid component element. Instead of ' +
        'passing a component class, make sure to instantiate it by passing it ' +
        'to Preact.createElement.'
    );
    expect(() => shallowRenderer.render((<div />) as any)).toThrowError(
      'PreactShallowRenderer render(): Shallow rendering works only with ' +
        'custom components, not primitives (div). Instead of calling ' +
        '`.render(el)` and inspecting the rendered output, look at `el.props` ' +
        'directly instead.'
    );
  });

  it('should have shallow unmounting', () => {
    const componentWillUnmount = sinon.spy();

    class SomeComponent extends Component {
      componentWillUnmount = componentWillUnmount;
      render() {
        return <div />;
      }
    }

    const shallowRenderer = createRenderer();
    shallowRenderer.render(<SomeComponent />);
    shallowRenderer.unmount();

    expect(componentWillUnmount).toBeCalled();
  });

  it('can shallow render to null', () => {
    class SomeComponent extends Component {
      render() {
        return null;
      }
    }

    const shallowRenderer = createRenderer();
    const result = shallowRenderer.render(<SomeComponent />);

    expect(result).toBe(null);
  });

  it('can shallow render with a ref', () => {
    class SomeComponent extends Component {
      render() {
        // @ts-ignore Testing string refs don't cause crash
        return <div ref="hello" />;
      }
    }

    const shallowRenderer = createRenderer();
    // Shouldn't crash.
    shallowRenderer.render(<SomeComponent />);
  });

  it('lets you update shallowly rendered components', () => {
    class SomeComponent extends Component<
      { aNew?: string },
      { clicked: boolean }
    > {
      state = { clicked: false };

      onClick = () => {
        this.setState({ clicked: true });
      };

      render() {
        const className = this.state.clicked ? 'was-clicked' : '';

        if (this.props.aNew === 'prop') {
          return (
            <a href="#" onClick={this.onClick} className={className}>
              Test link
            </a>
          );
        } else {
          return (
            <div>
              <span className="child1" />
              <span className="child2" />
            </div>
          );
        }
      }
    }

    const shallowRenderer = createRenderer();
    const result = shallowRenderer.render(<SomeComponent />) as VNode;
    expect(result.type).toBe('div');
    expect(result.props.children).toEqual([
      <span className="child1" />,
      <span className="child2" />,
    ]);

    const updatedResult = shallowRenderer.render(
      <SomeComponent aNew="prop" />
    ) as VNode<any>;
    expect(updatedResult.type).toBe('a');

    const mockEvent = {};
    updatedResult.props.onClick(mockEvent);

    const updatedResultCausedByClick =
      shallowRenderer.getRenderOutput() as VNode<any>;
    expect(updatedResultCausedByClick.type).toBe('a');
    expect(updatedResultCausedByClick.props.className).toBe('was-clicked');
  });

  it('can access the mounted component instance', () => {
    class SimpleComponent extends Component<{ n: number }> {
      someMethod = () => {
        return this.props.n;
      };

      render() {
        return <div>{this.props.n}</div>;
      }
    }

    const shallowRenderer = createRenderer();
    shallowRenderer.render(<SimpleComponent n={5} />);
    const instance = shallowRenderer.getMountedInstance() as SimpleComponent;
    expect(instance.someMethod()).toEqual(5);
  });

  it('can shallowly render components with contextTypes', () => {
    class SimpleComponent extends Component {
      static contextTypes = {
        name: PropTypes.string,
      };

      render() {
        return <div />;
      }
    }

    const shallowRenderer = createRenderer();
    const result = shallowRenderer.render(<SimpleComponent />);
    expect(result).toEqual(<div />);
  });

  it('passes expected params to legacy component lifecycle methods', () => {
    const componentDidUpdateParams: any[] = [];
    const componentWillReceivePropsParams: any[] = [];
    const componentWillUpdateParams: any[] = [];
    const setStateParams: any[] = [];
    const shouldComponentUpdateParams: any[] = [];

    const initialProp = { prop: 'init prop' };
    const initialState = { state: 'init state' };
    const initialContext = { context: 'init context' };
    const updatedState = { state: 'updated state' };
    const updatedProp = { prop: 'updated prop' };
    const updatedContext = { context: 'updated context' };

    class SimpleComponent extends Component<
      { prop: string },
      { state: string }
    > {
      constructor(props: any, context: any) {
        super(props, context);
        this.state = initialState;
      }
      static contextTypes = {
        context: PropTypes.string,
      };
      componentDidUpdate(...args: any[]) {
        componentDidUpdateParams.push(...args);
      }
      UNSAFE_componentWillReceiveProps(...args: any[]) {
        componentWillReceivePropsParams.push(...args);
        this.setState((...innerArgs) => {
          setStateParams.push(...innerArgs);
          return updatedState;
        });
      }
      UNSAFE_componentWillUpdate(...args: any[]) {
        componentWillUpdateParams.push(...args);
      }
      shouldComponentUpdate(...args: any[]) {
        shouldComponentUpdateParams.push(...args);
        return true;
      }
      render() {
        return null;
      }
    }

    const shallowRenderer = createRenderer();
    shallowRenderer.render(
      createElement(SimpleComponent, initialProp),
      initialContext
    );
    expect(componentDidUpdateParams).toEqual([]);
    expect(componentWillReceivePropsParams).toEqual([]);
    expect(componentWillUpdateParams).toEqual([]);
    expect(setStateParams).toEqual([]);
    expect(shouldComponentUpdateParams).toEqual([]);

    // Lifecycle hooks should be invoked with the correct prev/next params on update.
    shallowRenderer.render(
      createElement(SimpleComponent, updatedProp),
      updatedContext
    );
    expect(componentWillReceivePropsParams).toEqual([
      updatedProp,
      updatedContext,
    ]);
    expect(setStateParams).toEqual([initialState, initialProp]);
    expect(shouldComponentUpdateParams).toEqual([
      updatedProp,
      updatedState,
      updatedContext,
    ]);
    expect(componentWillUpdateParams).toEqual([
      updatedProp,
      updatedState,
      updatedContext,
    ]);
    expect(componentDidUpdateParams).toEqual([]);
  });

  it('passes expected params to new component lifecycle methods', () => {
    const componentDidUpdateParams: any[] = [];
    const getDerivedStateFromPropsParams: any[] = [];
    const shouldComponentUpdateParams: any[] = [];

    const initialProp = { prop: 'init prop' };
    const initialState = { state: 'init state' };
    const initialContext = { context: 'init context' };
    const updatedProp = { prop: 'updated prop' };
    const updatedContext = { context: 'updated context' };

    class SimpleComponent extends Component<
      { prop: string },
      { state: string }
    > {
      constructor(props: any, context: any) {
        super(props, context);
        this.state = initialState;
      }
      static contextTypes = {
        context: PropTypes.string,
      };
      componentDidUpdate(...args: any[]) {
        componentDidUpdateParams.push(...args);
      }
      static getDerivedStateFromProps(...args: any[]) {
        getDerivedStateFromPropsParams.push(args);
        return null;
      }
      shouldComponentUpdate(...args: any) {
        shouldComponentUpdateParams.push(...args);
        return true;
      }
      render() {
        return null;
      }
    }

    const shallowRenderer = createRenderer();

    // The only lifecycle hook that should be invoked on initial render
    // Is the static getDerivedStateFromProps() methods
    shallowRenderer.render(
      createElement(SimpleComponent, initialProp),
      initialContext
    );
    expect(getDerivedStateFromPropsParams).toEqual([
      [initialProp, initialState],
    ]);
    expect(componentDidUpdateParams).toEqual([]);
    expect(shouldComponentUpdateParams).toEqual([]);

    // Lifecycle hooks should be invoked with the correct prev/next params on update.
    shallowRenderer.render(
      createElement(SimpleComponent, updatedProp),
      updatedContext
    );
    expect(getDerivedStateFromPropsParams).toEqual([
      [initialProp, initialState],
      [updatedProp, initialState],
    ]);
    expect(shouldComponentUpdateParams).toEqual([
      updatedProp,
      initialState,
      updatedContext,
    ]);
    expect(componentDidUpdateParams).toEqual([]);
  });

  it('can shallowly render components with ref as function', () => {
    class SimpleComponent extends Component {
      state = { clicked: false };

      handleUserClick = () => {
        this.setState({ clicked: true });
      };

      render() {
        return (
          <div
            ref={() => {}}
            onClick={this.handleUserClick}
            className={this.state.clicked ? 'clicked' : ''}
          />
        );
      }
    }

    const shallowRenderer = createRenderer();
    shallowRenderer.render(<SimpleComponent />);
    let result = shallowRenderer.getRenderOutput() as VNode<any>;
    expect(result.type).toEqual('div');
    expect(result.props.className).toEqual('');
    result.props.onClick();

    result = shallowRenderer.getRenderOutput() as VNode<any>;
    expect(result.type).toEqual('div');
    expect(result.props.className).toEqual('clicked');
  });

  it('can initialize state via static getDerivedStateFromProps', () => {
    class SimpleComponent extends Component<
      { incrementBy: number },
      { count: number; other?: string }
    > {
      state = {
        count: 1,
      };

      static getDerivedStateFromProps(props: any, prevState: any) {
        return {
          count: prevState.count + props.incrementBy,
          other: 'foobar',
        };
      }

      render() {
        return (
          <div>{`count:${this.state.count}, other:${
            (this.state as any).other
          }`}</div>
        );
      }
    }

    const shallowRenderer = createRenderer();
    const result = shallowRenderer.render(<SimpleComponent incrementBy={2} />);
    expect(result).toEqual(<div>count:3, other:foobar</div>);
  });

  /*
  it('can setState in componentWillMount when shallow rendering', () => {
    class SimpleComponent extends React.Component {
      UNSAFE_componentWillMount() {
        this.setState({ groovy: 'doovy' });
      }

      render() {
        return <div>{this.state.groovy}</div>;
      }
    }

    const shallowRenderer = createRenderer();
    const result = shallowRenderer.render(<SimpleComponent />);
    expect(result).toEqual(<div>doovy</div>);
  });

  it('can setState in componentWillMount repeatedly when shallow rendering', () => {
    class SimpleComponent extends React.Component {
      state = {
        separator: '-',
      };

      UNSAFE_componentWillMount() {
        this.setState({ groovy: 'doovy' });
        this.setState({ doovy: 'groovy' });
      }

      render() {
        const { groovy, doovy, separator } = this.state;

        return <div>{`${groovy}${separator}${doovy}`}</div>;
      }
    }

    const shallowRenderer = createRenderer();
    const result = shallowRenderer.render(<SimpleComponent />);
    expect(result).toEqual(<div>doovy-groovy</div>);
  });

  it('can setState in componentWillMount with an updater function repeatedly when shallow rendering', () => {
    class SimpleComponent extends React.Component {
      state = {
        separator: '-',
      };

      UNSAFE_componentWillMount() {
        this.setState(state => ({ groovy: 'doovy' }));
        this.setState(state => ({ doovy: state.groovy }));
      }

      render() {
        const { groovy, doovy, separator } = this.state;

        return <div>{`${groovy}${separator}${doovy}`}</div>;
      }
    }

    const shallowRenderer = createRenderer();
    const result = shallowRenderer.render(<SimpleComponent />);
    expect(result).toEqual(<div>doovy-doovy</div>);
  });

  it('can setState in componentWillReceiveProps when shallow rendering', () => {
    class SimpleComponent extends React.Component {
      state = { count: 0 };

      UNSAFE_componentWillReceiveProps(nextProps) {
        if (nextProps.updateState) {
          this.setState({ count: 1 });
        }
      }

      render() {
        return <div>{this.state.count}</div>;
      }
    }

    const shallowRenderer = createRenderer();
    let result = shallowRenderer.render(
      <SimpleComponent updateState={false} />
    );
    expect(result.props.children).toEqual(0);

    result = shallowRenderer.render(<SimpleComponent updateState={true} />);
    expect(result.props.children).toEqual(1);
  });

  it('can update state with static getDerivedStateFromProps when shallow rendering', () => {
    class SimpleComponent extends React.Component {
      state = { count: 1 };

      static getDerivedStateFromProps(nextProps, prevState) {
        if (nextProps.updateState) {
          return { count: nextProps.incrementBy + prevState.count };
        }

        return null;
      }

      render() {
        return <div>{this.state.count}</div>;
      }
    }

    const shallowRenderer = createRenderer();
    let result = shallowRenderer.render(
      <SimpleComponent updateState={false} incrementBy={0} />
    );
    expect(result.props.children).toEqual(1);

    result = shallowRenderer.render(
      <SimpleComponent updateState={true} incrementBy={2} />
    );
    expect(result.props.children).toEqual(3);

    result = shallowRenderer.render(
      <SimpleComponent updateState={false} incrementBy={2} />
    );
    expect(result.props.children).toEqual(3);
  });

  it('should not override state with stale values if prevState is spread within getDerivedStateFromProps', () => {
    class SimpleComponent extends React.Component {
      state = { value: 0 };

      static getDerivedStateFromProps(nextProps, prevState) {
        return { ...prevState };
      }

      updateState = () => {
        this.setState(state => ({ value: state.value + 1 }));
      };

      render() {
        return <div>{`value:${this.state.value}`}</div>;
      }
    }

    const shallowRenderer = createRenderer();
    let result = shallowRenderer.render(<SimpleComponent />);
    expect(result).toEqual(<div>value:0</div>);

    let instance = shallowRenderer.getMountedInstance();
    instance.updateState();
    result = shallowRenderer.getRenderOutput();
    expect(result).toEqual(<div>value:1</div>);
  });

  it('should pass previous state to shouldComponentUpdate even with getDerivedStateFromProps', () => {
    class SimpleComponent extends React.Component {
      constructor(props) {
        super(props);
        this.state = {
          value: props.value,
        };
      }

      static getDerivedStateFromProps(nextProps, prevState) {
        if (nextProps.value === prevState.value) {
          return null;
        }
        return { value: nextProps.value };
      }

      shouldComponentUpdate(nextProps, nextState) {
        return nextState.value !== this.state.value;
      }

      render() {
        return <div>{`value:${this.state.value}`}</div>;
      }
    }

    const shallowRenderer = createRenderer();
    const initialResult = shallowRenderer.render(
      <SimpleComponent value="initial" />
    );
    expect(initialResult).toEqual(<div>value:initial</div>);
    const updatedResult = shallowRenderer.render(
      <SimpleComponent value="updated" />
    );
    expect(updatedResult).toEqual(<div>value:updated</div>);
  });

  it('can setState with an updater function', () => {
    let instance;

    class SimpleComponent extends React.Component {
      state = {
        counter: 0,
      };

      render() {
        instance = this;
        return (
          <button ref="button" onClick={this.onClick}>
            {this.state.counter}
          </button>
        );
      }
    }

    const shallowRenderer = createRenderer();
    let result = shallowRenderer.render(<SimpleComponent defaultCount={1} />);
    expect(result.props.children).toEqual(0);

    instance.setState((state, props) => {
      return { counter: props.defaultCount + 1 };
    });

    result = shallowRenderer.getRenderOutput();
    expect(result.props.children).toEqual(2);
  });

  it('can access component instance from setState updater function', done => {
    let instance;

    class SimpleComponent extends React.Component {
      state = {};

      render() {
        instance = this;
        return null;
      }
    }

    const shallowRenderer = createRenderer();
    shallowRenderer.render(<SimpleComponent />);

    instance.setState(function updater(state, props) {
      expect(this).toBe(instance);
      done();
    });
  });

  it('can setState with a callback', () => {
    let instance;

    class SimpleComponent extends React.Component {
      state = {
        counter: 0,
      };
      render() {
        instance = this;
        return <p>{this.state.counter}</p>;
      }
    }

    const shallowRenderer = createRenderer();
    const result = shallowRenderer.render(<SimpleComponent />);
    expect(result.props.children).toBe(0);

    const callback = jest.fn(function () {
      expect(this).toBe(instance);
    });

    instance.setState({ counter: 1 }, callback);

    const updated = shallowRenderer.getRenderOutput();
    expect(updated.props.children).toBe(1);
    expect(callback).toHaveBeenCalled();
  });

  it('can replaceState with a callback', () => {
    let instance;

    class SimpleComponent extends React.Component {
      state = {
        counter: 0,
      };
      render() {
        instance = this;
        return <p>{this.state.counter}</p>;
      }
    }

    const shallowRenderer = createRenderer();
    const result = shallowRenderer.render(<SimpleComponent />);
    expect(result.props.children).toBe(0);

    const callback = jest.fn(function () {
      expect(this).toBe(instance);
    });

    // No longer a public API, but we can test that it works internally by
    // reaching into the updater.
    shallowRenderer._updater.enqueueReplaceState(
      instance,
      { counter: 1 },
      callback
    );

    const updated = shallowRenderer.getRenderOutput();
    expect(updated.props.children).toBe(1);
    expect(callback).toHaveBeenCalled();
  });

  it('can forceUpdate with a callback', () => {
    let instance;

    class SimpleComponent extends React.Component {
      state = {
        counter: 0,
      };
      render() {
        instance = this;
        return <p>{this.state.counter}</p>;
      }
    }

    const shallowRenderer = createRenderer();
    const result = shallowRenderer.render(<SimpleComponent />);
    expect(result.props.children).toBe(0);

    const callback = jest.fn(function () {
      expect(this).toBe(instance);
    });

    instance.forceUpdate(callback);

    const updated = shallowRenderer.getRenderOutput();
    expect(updated.props.children).toBe(0);
    expect(callback).toHaveBeenCalled();
  });

  it('can pass context when shallowly rendering', () => {
    class SimpleComponent extends React.Component {
      static contextTypes = {
        name: PropTypes.string,
      };

      render() {
        return <div>{this.context.name}</div>;
      }
    }

    const shallowRenderer = createRenderer();
    const result = shallowRenderer.render(<SimpleComponent />, {
      name: 'foo',
    });
    expect(result).toEqual(<div>foo</div>);
  });

  it('should track context across updates', () => {
    class SimpleComponent extends React.Component {
      static contextTypes = {
        foo: PropTypes.string,
      };

      state = {
        bar: 'bar',
      };

      render() {
        return <div>{`${this.context.foo}:${this.state.bar}`}</div>;
      }
    }

    const shallowRenderer = createRenderer();
    let result = shallowRenderer.render(<SimpleComponent />, {
      foo: 'foo',
    });
    expect(result).toEqual(<div>foo:bar</div>);

    const instance = shallowRenderer.getMountedInstance();
    instance.setState({ bar: 'baz' });

    result = shallowRenderer.getRenderOutput();
    expect(result).toEqual(<div>foo:baz</div>);
  });

  it('should filter context by contextTypes', () => {
    class SimpleComponent extends React.Component {
      static contextTypes = {
        foo: PropTypes.string,
      };
      render() {
        return <div>{`${this.context.foo}:${this.context.bar}`}</div>;
      }
    }

    const shallowRenderer = createRenderer();
    let result = shallowRenderer.render(<SimpleComponent />, {
      foo: 'foo',
      bar: 'bar',
    });
    expect(result).toEqual(<div>foo:undefined</div>);
  });

  it('can fail context when shallowly rendering', () => {
    class SimpleComponent extends React.Component {
      static contextTypes = {
        name: PropTypes.string.isRequired,
      };

      render() {
        return <div>{this.context.name}</div>;
      }
    }

    const shallowRenderer = createRenderer();
    expect(() => shallowRenderer.render(<SimpleComponent />)).toErrorDev(
      'Warning: Failed context type: The context `name` is marked as ' +
        'required in `SimpleComponent`, but its value is `undefined`.\n' +
        '    in SimpleComponent (at **)'
    );
  });

  it('should warn about propTypes (but only once)', () => {
    class SimpleComponent extends React.Component {
      render() {
        return React.createElement('div', null, this.props.name);
      }
    }

    SimpleComponent.propTypes = {
      name: PropTypes.string.isRequired,
    };

    const shallowRenderer = createRenderer();
    expect(() =>
      shallowRenderer.render(
        React.createElement(SimpleComponent, { name: 123 })
      )
    ).toErrorDev(
      'Warning: Failed prop type: Invalid prop `name` of type `number` ' +
        'supplied to `SimpleComponent`, expected `string`.',
      { withoutStack: true }
    );
  });

  it('should enable rendering of cloned element', () => {
    class SimpleComponent extends React.Component {
      constructor(props) {
        super(props);

        this.state = {
          bar: 'bar',
        };
      }

      render() {
        return <div>{`${this.props.foo}:${this.state.bar}`}</div>;
      }
    }

    const shallowRenderer = createRenderer();
    const el = <SimpleComponent foo="foo" />;
    let result = shallowRenderer.render(el);
    expect(result).toEqual(<div>foo:bar</div>);

    const cloned = React.cloneElement(el, { foo: 'baz' });
    result = shallowRenderer.render(cloned);
    expect(result).toEqual(<div>baz:bar</div>);
  });

  it('this.state should be updated on setState callback inside componentWillMount', () => {
    let stateSuccessfullyUpdated = false;

    class Component extends React.Component {
      constructor(props, context) {
        super(props, context);
        this.state = {
          hasUpdatedState: false,
        };
      }

      UNSAFE_componentWillMount() {
        this.setState(
          { hasUpdatedState: true },
          () => (stateSuccessfullyUpdated = this.state.hasUpdatedState)
        );
      }

      render() {
        return <div>{this.props.children}</div>;
      }
    }

    const shallowRenderer = createRenderer();
    shallowRenderer.render(<Component />);
    expect(stateSuccessfullyUpdated).toBe(true);
  });

  it('should handle multiple callbacks', () => {
    const mockFn = jest.fn();
    const shallowRenderer = createRenderer();

    class Component extends React.Component {
      constructor(props, context) {
        super(props, context);
        this.state = {
          foo: 'foo',
        };
      }

      UNSAFE_componentWillMount() {
        this.setState({ foo: 'bar' }, () => mockFn());
        this.setState({ foo: 'foobar' }, () => mockFn());
      }

      render() {
        return <div>{this.state.foo}</div>;
      }
    }

    shallowRenderer.render(<Component />);

    expect(mockFn).toHaveBeenCalledTimes(2);

    // Ensure the callback queue is cleared after the callbacks are invoked
    const mountedInstance = shallowRenderer.getMountedInstance();
    mountedInstance.setState({ foo: 'bar' }, () => mockFn());
    expect(mockFn).toHaveBeenCalledTimes(3);
  });

  it('should call the setState callback even if shouldComponentUpdate = false', done => {
    const mockFn = jest.fn().mockReturnValue(false);

    class Component extends React.Component {
      constructor(props, context) {
        super(props, context);
        this.state = {
          hasUpdatedState: false,
        };
      }

      shouldComponentUpdate() {
        return mockFn();
      }

      render() {
        return <div>{this.state.hasUpdatedState}</div>;
      }
    }

    const shallowRenderer = createRenderer();
    shallowRenderer.render(<Component />);

    const mountedInstance = shallowRenderer.getMountedInstance();
    mountedInstance.setState({ hasUpdatedState: true }, () => {
      expect(mockFn).toBeCalled();
      expect(mountedInstance.state.hasUpdatedState).toBe(true);
      done();
    });
  });

  it('throws usefully when rendering badly-typed elements', () => {
    const shallowRenderer = createRenderer();

    const renderAndVerifyWarningAndError = (Component, typeString) => {
      expect(() => {
        expect(() => shallowRenderer.render(<Component />)).toErrorDev(
          'React.createElement: type is invalid -- expected a string ' +
            '(for built-in components) or a class/function (for composite components) ' +
            `but got: ${typeString}.`
        );
      }).toThrowError(
        'ReactShallowRenderer render(): Shallow rendering works only with custom ' +
          `components, but the provided element type was \`${typeString}\`.`
      );
    };

    renderAndVerifyWarningAndError(undefined, 'undefined');
    renderAndVerifyWarningAndError(null, 'null');
    renderAndVerifyWarningAndError([], 'array');
    renderAndVerifyWarningAndError({}, 'object');
  });

  it('should have initial state of null if not defined', () => {
    class SomeComponent extends React.Component {
      render() {
        return <span />;
      }
    }

    const shallowRenderer = createRenderer();
    shallowRenderer.render(<SomeComponent />);

    expect(shallowRenderer.getMountedInstance().state).toBeNull();
  });

  it('should invoke both deprecated and new lifecycles if both are present', () => {
    const log = [];

    class Component extends React.Component {
      componentWillMount() {
        log.push('componentWillMount');
      }
      componentWillReceiveProps() {
        log.push('componentWillReceiveProps');
      }
      componentWillUpdate() {
        log.push('componentWillUpdate');
      }
      UNSAFE_componentWillMount() {
        log.push('UNSAFE_componentWillMount');
      }
      UNSAFE_componentWillReceiveProps() {
        log.push('UNSAFE_componentWillReceiveProps');
      }
      UNSAFE_componentWillUpdate() {
        log.push('UNSAFE_componentWillUpdate');
      }
      render() {
        return null;
      }
    }

    const shallowRenderer = createRenderer();
    shallowRenderer.render(<Component foo="bar" />);
    expect(log).toEqual(['componentWillMount', 'UNSAFE_componentWillMount']);

    log.length = 0;

    shallowRenderer.render(<Component foo="baz" />);
    expect(log).toEqual([
      'componentWillReceiveProps',
      'UNSAFE_componentWillReceiveProps',
      'componentWillUpdate',
      'UNSAFE_componentWillUpdate',
    ]);
  });

  it('should stop the update when setState returns null or undefined', () => {
    const log = [];
    let instance;
    class Component extends React.Component {
      constructor(props) {
        super(props);
        this.state = {
          count: 0,
        };
      }
      render() {
        log.push('render');
        instance = this;
        return null;
      }
    }
    const shallowRenderer = createRenderer();
    shallowRenderer.render(<Component />);
    log.length = 0;
    instance.setState(() => null);
    instance.setState(() => undefined);
    instance.setState(null);
    instance.setState(undefined);
    expect(log).toEqual([]);
    instance.setState(state => ({ count: state.count + 1 }));
    expect(log).toEqual(['render']);
  });

  it('should not get this in a function component', () => {
    const logs = [];
    function Foo() {
      logs.push(this);
      return <div>foo</div>;
    }
    const shallowRenderer = createRenderer();
    shallowRenderer.render(<Foo foo="bar" />);
    expect(logs).toEqual([undefined]);
  });

  it('should handle memo', () => {
    function Foo() {
      return <div>foo</div>;
    }
    const MemoFoo = React.memo(Foo);
    const shallowRenderer = createRenderer();
    shallowRenderer.render(<MemoFoo />);
  });

  it('should enable React.memo to prevent a re-render', () => {
    const logs = [];
    const Foo = React.memo(({ count }) => {
      logs.push(`Foo: ${count}`);
      return <div>{count}</div>;
    });
    const Bar = React.memo(({ count }) => {
      logs.push(`Bar: ${count}`);
      return <div>{count}</div>;
    });
    const shallowRenderer = createRenderer();
    shallowRenderer.render(<Foo count={1} />);
    expect(logs).toEqual(['Foo: 1']);
    logs.length = 0;
    // Rendering the same element with the same props should be prevented
    shallowRenderer.render(<Foo count={1} />);
    expect(logs).toEqual([]);
    // A different element with the same props should cause a re-render
    shallowRenderer.render(<Bar count={1} />);
    expect(logs).toEqual(['Bar: 1']);
  });

  it('should respect a custom comparison function with React.memo', () => {
    let renderCount = 0;
    function areEqual(props, nextProps) {
      return props.foo === nextProps.foo;
    }
    const Foo = React.memo(({ foo, bar }) => {
      renderCount++;
      return (
        <div>
          {foo} {bar}
        </div>
      );
    }, areEqual);

    const shallowRenderer = createRenderer();
    shallowRenderer.render(<Foo foo={1} bar={1} />);
    expect(renderCount).toBe(1);
    // Change a prop that the comparison funciton ignores
    shallowRenderer.render(<Foo foo={1} bar={2} />);
    expect(renderCount).toBe(1);
    shallowRenderer.render(<Foo foo={2} bar={2} />);
    expect(renderCount).toBe(2);
  });

  it('should not call the comparison function with React.memo on the initial render', () => {
    const areEqual = jest.fn(() => false);
    const SomeComponent = React.memo(({ foo }) => {
      return <div>{foo}</div>;
    }, areEqual);
    const shallowRenderer = createRenderer();
    shallowRenderer.render(<SomeComponent foo={1} />);
    expect(areEqual).not.toHaveBeenCalled();
    expect(shallowRenderer.getRenderOutput()).toEqual(<div>{1}</div>);
  });

  it('should handle memo(forwardRef())', () => {
    const testRef = React.createRef();
    const SomeComponent = React.forwardRef((props, ref) => {
      expect(ref).toEqual(testRef);
      return (
        <div>
          <span className="child1" />
          <span className="child2" />
        </div>
      );
    });

    const SomeMemoComponent = React.memo(SomeComponent);

    const shallowRenderer = createRenderer();
    const result = shallowRenderer.render(<SomeMemoComponent ref={testRef} />);

    expect(result.type).toBe('div');
    expect(result.props.children).toEqual([
      <span className="child1" />,
      <span className="child2" />,
    ]);
  });

  it('should warn for forwardRef(memo())', () => {
    const testRef = React.createRef();
    const SomeMemoComponent = React.memo(({ foo }) => {
      return <div>{foo}</div>;
    });
    const shallowRenderer = createRenderer();
    expect(() => {
      expect(() => {
        const SomeComponent = React.forwardRef(SomeMemoComponent);
        shallowRenderer.render(<SomeComponent ref={testRef} />);
      }).toErrorDev(
        'Warning: forwardRef requires a render function but received ' +
          'a `memo` component. Instead of forwardRef(memo(...)), use ' +
          'memo(forwardRef(...))',
        { withoutStack: true }
      );
    }).toThrowError(
      'forwardRef requires a render function but was given object.'
    );
  });

  it('should let you change type', () => {
    function Foo({ prop }) {
      return <div>Foo {prop}</div>;
    }
    function Bar({ prop }) {
      return <div>Bar {prop}</div>;
    }

    const shallowRenderer = createRenderer();
    shallowRenderer.render(<Foo prop="foo1" />);
    expect(shallowRenderer.getRenderOutput()).toEqual(<div>Foo {'foo1'}</div>);
    shallowRenderer.render(<Foo prop="foo2" />);
    expect(shallowRenderer.getRenderOutput()).toEqual(<div>Foo {'foo2'}</div>);
    shallowRenderer.render(<Bar prop="bar1" />);
    expect(shallowRenderer.getRenderOutput()).toEqual(<div>Bar {'bar1'}</div>);
    shallowRenderer.render(<Bar prop="bar2" />);
    expect(shallowRenderer.getRenderOutput()).toEqual(<div>Bar {'bar2'}</div>);
  });

  it('should let you change class type', () => {
    class Foo extends React.Component {
      render() {
        return <div>Foo {this.props.prop}</div>;
      }
    }
    class Bar extends React.Component {
      render() {
        return <div>Bar {this.props.prop}</div>;
      }
    }

    const shallowRenderer = createRenderer();
    shallowRenderer.render(<Foo prop="foo1" />);
    expect(shallowRenderer.getRenderOutput()).toEqual(<div>Foo {'foo1'}</div>);
    shallowRenderer.render(<Foo prop="foo2" />);
    expect(shallowRenderer.getRenderOutput()).toEqual(<div>Foo {'foo2'}</div>);
    shallowRenderer.render(<Bar prop="bar1" />);
    expect(shallowRenderer.getRenderOutput()).toEqual(<div>Bar {'bar1'}</div>);
    shallowRenderer.render(<Bar prop="bar2" />);
    expect(shallowRenderer.getRenderOutput()).toEqual(<div>Bar {'bar2'}</div>);
  });
  */
});
