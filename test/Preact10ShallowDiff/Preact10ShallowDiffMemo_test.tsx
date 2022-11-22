/**
 * This file is largely taken and adapted from react-shallow-renderer, which is
 * copyrighted to Facebook and licensed under the MIT License, found a the link
 * below:
 *
 * https://github.com/enzymejs/react-shallow-renderer/blob/802c735ee53bf2d965797760698cacbd46088f66/LICENSE
 */

/* eslint-disable @typescript-eslint/no-this-alias */

import * as preact from 'preact/compat';
import type { ComponentType, VNode } from 'preact';
import PropTypes from 'prop-types';
import sinon from 'sinon';

import Preact10ShallowDiff from '../../src/Preact10ShallowDiff.js';
import { expect, installVNodeTestHook } from './utils.js';

const {
  Component,
  PureComponent,
  createElement,
  cloneElement,
  memo: realMemo,
} = preact;
const createRenderer = Preact10ShallowDiff.createRenderer;

function memo<T extends ComponentType<any>>(component: T): T {
  return realMemo<T>(component as any) as any;
}

const skip = (...args: any[]) => {};

// TODO: React.memo doesn't manifest as a separate component in the virtual
// tree, so calls to `instance.setState` and other methods are expected to
// operate on the underlying component beneath memo. However in Preact, since
// `memo` is it's own component, calls to `instance.setState` operate on the
// memo component and not the real component underneath it. Might need to fix
// this for proper shallow rendering to work.
skip('Preact10ShallowDiffMemo', () => {
  installVNodeTestHook();

  it('should call all of the legacy lifecycle hooks', () => {
    const logs: string[] = [];
    const logger = (message: string) => () => {
      logs.push(message);
    };

    const SomeComponent = memo(
      class SomeComponent extends Component<{ foo: number }> {
        UNSAFE_componentWillMount = logger('componentWillMount');
        componentDidMount = logger('componentDidMount');
        UNSAFE_componentWillReceiveProps = logger('componentWillReceiveProps');
        shouldComponentUpdate = () => {
          logger('shouldComponentUpdate')();
          return true;
        };
        UNSAFE_componentWillUpdate = logger('componentWillUpdate');
        componentDidUpdate = logger('componentDidUpdate');
        componentWillUnmount = logger('componentWillUnmount');
        render() {
          return <div />;
        }
      }
    );

    const shallowRenderer = createRenderer();
    shallowRenderer.render(<SomeComponent foo={1} />);

    // Calling cDU might lead to problems with host component references.
    // Since our components aren't really mounted, refs won't be available.
    expect(logs).toEqual(['componentWillMount']);

    logs.splice(0);

    const instance = shallowRenderer.getMountedInstance()!;
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
    };

    const SomeComponent = memo(
      class SomeComponent extends Component<{ foo: number }> {
        state = {};
        static getDerivedStateFromProps = () => {
          logger('getDerivedStateFromProps')();
          return null;
        };
        componentDidMount = logger('componentDidMount');
        shouldComponentUpdate = () => {
          logger('shouldComponentUpdate')();
          return true;
        };
        componentDidUpdate = logger('componentDidUpdate');
        componentWillUnmount = logger('componentWillUnmount');
        render() {
          return <div />;
        }
      }
    );

    const shallowRenderer = createRenderer();
    shallowRenderer.render(<SomeComponent foo={1} />);

    // Calling cDU might lead to problems with host component references.
    // Since our components aren't really mounted, refs won't be available.
    expect(logs).toEqual(['getDerivedStateFromProps']);

    logs.splice(0);

    const instance = shallowRenderer.getMountedInstance()!;
    instance.setState({});

    expect(logs).toEqual(['getDerivedStateFromProps', 'shouldComponentUpdate']);

    logs.splice(0);

    shallowRenderer.render(<SomeComponent foo={2} />);

    // The previous shallow renderer did not trigger cDU for props changes.
    expect(logs).toEqual(['getDerivedStateFromProps', 'shouldComponentUpdate']);
  });

  it('should not invoke deprecated lifecycles (cWM/cWRP/cWU) if new static gDSFP is present', () => {
    const SomeComponent = memo(
      class SomeComponent extends Component {
        state = {};
        static getDerivedStateFromProps() {
          return null;
        }
        componentWillMount() {
          throw Error('unexpected');
        }
        componentWillReceiveProps() {
          throw Error('unexpected');
        }
        componentWillUpdate() {
          throw Error('unexpected');
        }
        render() {
          return null;
        }
      }
    );

    const shallowRenderer = createRenderer();
    shallowRenderer.render(<SomeComponent />);
  });

  // Preact doesn't use gSBU as a signal to avoid deprecated lifecycles. Only gDSFP is that signal
  it.skip('should not invoke deprecated lifecycles (cWM/cWRP/cWU) if new getSnapshotBeforeUpdate is present', () => {
    const SomeComponent = memo(
      class SomeComponent extends Component<{ value: number }> {
        getSnapshotBeforeUpdate() {
          return null;
        }
        componentWillMount() {
          throw Error('unexpected');
        }
        componentWillReceiveProps() {
          throw Error('unexpected');
        }
        componentWillUpdate() {
          throw Error('unexpected');
        }
        render() {
          return null;
        }
      }
    );

    const shallowRenderer = createRenderer();
    shallowRenderer.render(<SomeComponent value={1} />);
    shallowRenderer.render(<SomeComponent value={2} />);
  });

  it('should not call getSnapshotBeforeUpdate or componentDidUpdate when updating since refs wont exist', () => {
    const SomeComponent = memo(
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
    );

    const shallowRenderer = createRenderer();
    shallowRenderer.render(<SomeComponent value={1} />);
    shallowRenderer.render(<SomeComponent value={2} />);
  });

  it('should only render 1 level deep', () => {
    const Parent = memo(function Parent() {
      return (
        <div>
          <Child />
        </div>
      );
    });

    function Child(): JSX.Element {
      throw Error('This component should not render');
    }

    const shallowRenderer = createRenderer();
    shallowRenderer.render(createElement(Parent, null));
  });

  it('should have shallow rendering', () => {
    const SomeComponent = memo(
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
    );

    const shallowRenderer = createRenderer();
    const result = shallowRenderer.render(<SomeComponent />) as VNode<any>;

    expect(result.type).toBe('div');
    expect(result.props.children).toEqual([
      <span className="child1" />,
      <span className="child2" />,
    ]);
  });

  it.skip('should handle Profiler', () => {
    // To make TS happy;
    const Profiler = (props: any) => props.children;

    const SomeComponent = memo(
      class SomeComponent extends Component {
        render() {
          return (
            <Profiler id="test" onRender={sinon.spy()}>
              <div>
                <span className="child1" />
                <span className="child2" />
              </div>
            </Profiler>
          );
        }
      }
    );

    const shallowRenderer = createRenderer();
    const result = shallowRenderer.render(<SomeComponent />) as VNode<any>;

    expect(result.type).toBe(Profiler);
    expect(result.props.children).toEqual(
      <div>
        <span className="child1" />
        <span className="child2" />
      </div>
    );
  });

  it('should enable shouldComponentUpdate to prevent a re-render', () => {
    type State = { update: boolean };
    let renderCounter = 0;
    const SimpleComponent = memo(
      class SimpleComponent extends Component<{}, State> {
        state = { update: false };
        shouldComponentUpdate(nextProps: {}, nextState: State) {
          return this.state.update !== nextState.update;
        }
        render() {
          renderCounter++;
          return <div>{`${renderCounter}`}</div>;
        }
      }
    );

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
    const SimpleComponent = memo(
      class SimpleComponent extends PureComponent {
        state = { update: false };
        render() {
          renderCounter++;
          return <div>{`${renderCounter}`}</div>;
        }
      }
    );

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
    let scuCounter = 0;
    const SimpleComponent = memo(
      class SimpleComponent extends Component {
        state = { count: 1 };
        shouldComponentUpdate() {
          scuCounter++;
          return false;
        }
        render() {
          return <div>{`${this.state.count}`}</div>;
        }
      }
    );

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
    const SimpleComponent = memo(
      class SimpleComponent extends Component {
        render() {
          renderCounter += 1;
          return <div />;
        }
      }
    );

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
    const SomeMemoComponent = memo(SomeComponent);

    SomeComponent.contextTypes = {
      bar: PropTypes.string,
    };

    const shallowRenderer = createRenderer();
    const result = shallowRenderer.render(<SomeMemoComponent foo={'FOO'} />, {
      bar: 'BAR',
    }) as VNode<any>;

    expect(result.type).toBe('div');
    expect(result.props.children).toEqual([
      <div>FOO</div>,
      <div>BAR</div>,
      <span className="child1" />,
      <span className="child2" />,
    ]);
  });

  it('should shallow render a component returning strings directly from render', () => {
    const Text = memo(({ value }) => value);

    const shallowRenderer = createRenderer();
    const result = shallowRenderer.render(<Text value="foo" />);
    expect(result).toEqual('foo');
  });

  it('should shallow render a component returning numbers directly from render', () => {
    const Text = memo(({ value }) => value);

    const shallowRenderer = createRenderer();
    const result = shallowRenderer.render(<Text value={10} />);
    expect(result).toEqual(10);
  });

  it('should shallow render a fragment', () => {
    class SomeComponent extends Component {
      render() {
        return <div />;
      }
    }
    class Fragment extends Component {
      render() {
        return [<div key="a" />, <span key="b" />, <SomeComponent />];
      }
    }
    const shallowRenderer = createRenderer();
    const result = shallowRenderer.render(<Fragment />);
    expect(result).toEqual([
      <div key="a" />,
      <span key="b" />,
      <SomeComponent />,
    ]);
  });

  it('should shallow render a fragment', () => {
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
      'Preact10ShallowDiff render(): Invalid component element. Instead of ' +
        'passing a component class, make sure to instantiate it by passing it ' +
        'to Preact.createElement.'
    );
    expect(() => shallowRenderer.render(<div />)).toThrowError(
      'Preact10ShallowDiff render(): Shallow rendering works only with ' +
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
        // @ts-ignore Allow string refs for this test
        return <div ref="hello" />;
      }
    }

    const shallowRenderer = createRenderer();
    // Shouldn't crash.
    shallowRenderer.render(<SomeComponent />);
  });

  it('lets you update shallowly rendered components', () => {
    class SomeComponent extends Component<{ aNew?: string }> {
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
    const result = shallowRenderer.render(<SomeComponent />) as VNode<any>;
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
    const SimpleComponent = memo(
      class SimpleComponent extends Component<{ n: number }> {
        someMethod = () => {
          return this.props.n;
        };

        render() {
          return <div>{this.props.n}</div>;
        }
      }
    );

    const shallowRenderer = createRenderer();
    shallowRenderer.render(<SimpleComponent n={5} />);
    const instance = shallowRenderer.getMountedInstance() as any;
    expect(instance.someMethod()).toEqual(5);
  });

  it('can shallowly render components with contextTypes', () => {
    const SimpleComponent = memo(
      class SimpleComponent extends Component {
        static contextTypes: any = {
          name: PropTypes.string,
        };

        render() {
          return <div />;
        }
      }
    );

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

    type Props = { prop: string };
    const SimpleComponent = memo(
      class SimpleComponent extends Component<Props> {
        constructor(props: Props, context: any) {
          super(props, context);
          this.state = initialState;
        }
        static contextTypes: any = {
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
    );

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

    type Props = { prop: string };
    const SimpleComponent = memo(
      class SimpleComponent extends Component<Props> {
        constructor(props: Props, context: any) {
          super(props, context);
          this.state = initialState;
        }
        static contextTypes: any = {
          context: PropTypes.string,
        };
        componentDidUpdate(...args: any[]) {
          componentDidUpdateParams.push(...args);
        }
        static getDerivedStateFromProps(...args: any[]) {
          getDerivedStateFromPropsParams.push(args);
          return null;
        }
        shouldComponentUpdate(...args: any[]) {
          shouldComponentUpdateParams.push(...args);
          return true;
        }
        render() {
          return null;
        }
      }
    );

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
    const SimpleComponent = memo(
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
    );

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
    type Props = { incrementBy: number };
    type State = { count: number; other?: string };
    const SimpleComponent = memo(
      class SimpleComponent extends Component<Props, State> {
        state: State = {
          count: 1,
        };

        static getDerivedStateFromProps(props: Props, prevState: State) {
          return {
            count: prevState.count + props.incrementBy,
            other: 'foobar',
          };
        }

        render() {
          return (
            <div>{`count:${this.state.count}, other:${this.state.other}`}</div>
          );
        }
      }
    );

    const shallowRenderer = createRenderer();
    const result = shallowRenderer.render(<SimpleComponent incrementBy={2} />);
    expect(result).toEqual(<div>count:3, other:foobar</div>);
  });

  it('can setState in componentWillMount when shallow rendering', () => {
    const SimpleComponent = memo(
      class SimpleComponent extends Component<{}, { groovy: string }> {
        UNSAFE_componentWillMount() {
          this.setState({ groovy: 'doovy' });
        }

        render() {
          return <div>{this.state.groovy}</div>;
        }
      }
    );

    const shallowRenderer = createRenderer();
    const result = shallowRenderer.render(<SimpleComponent />);
    expect(result).toEqual(<div>doovy</div>);
  });

  it('can setState in componentWillMount repeatedly when shallow rendering', () => {
    type State = { separator: string; groovy?: string; doovy?: string };
    const SimpleComponent = memo(
      class SimpleComponent extends Component<{}, State> {
        state: State = {
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
    );

    const shallowRenderer = createRenderer();
    const result = shallowRenderer.render(<SimpleComponent />);
    expect(result).toEqual(<div>doovy-groovy</div>);
  });

  it('can setState in componentWillMount with an updater function repeatedly when shallow rendering', () => {
    type State = { separator: string; groovy?: string; doovy?: string };
    const SimpleComponent = memo(
      class SimpleComponent extends Component<{}, State> {
        state: State = {
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
    );

    const shallowRenderer = createRenderer();
    const result = shallowRenderer.render(<SimpleComponent />);
    expect(result).toEqual(<div>doovy-doovy</div>);
  });

  it('can setState in componentWillReceiveProps when shallow rendering', () => {
    type Props = { updateState: boolean };
    type State = { count: number };
    const SimpleComponent = memo(
      class SimpleComponent extends Component<Props, State> {
        state = { count: 0 };

        UNSAFE_componentWillReceiveProps(nextProps: Props) {
          if (nextProps.updateState) {
            this.setState({ count: 1 });
          }
        }

        render() {
          return <div>{this.state.count}</div>;
        }
      }
    );

    const shallowRenderer = createRenderer();
    let result = shallowRenderer.render(
      <SimpleComponent updateState={false} />
    ) as VNode<any>;
    expect(result.props.children).toEqual(0);

    result = shallowRenderer.render(
      <SimpleComponent updateState={true} />
    ) as VNode<any>;
    expect(result.props.children).toEqual(1);
  });

  it('can update state with static getDerivedStateFromProps when shallow rendering', () => {
    type Props = { updateState: boolean; incrementBy: number };
    type State = { count: number };
    const SimpleComponent = memo(
      class SimpleComponent extends Component<Props, State> {
        state = { count: 1 };

        static getDerivedStateFromProps(nextProps: Props, prevState: State) {
          if (nextProps.updateState) {
            return { count: nextProps.incrementBy + prevState.count };
          }

          return null;
        }

        render() {
          return <div>{this.state.count}</div>;
        }
      }
    );

    const shallowRenderer = createRenderer();
    let result = shallowRenderer.render(
      <SimpleComponent updateState={false} incrementBy={0} />
    ) as VNode<any>;
    expect(result.props.children).toEqual(1);

    result = shallowRenderer.render(
      <SimpleComponent updateState={true} incrementBy={2} />
    ) as VNode<any>;
    expect(result.props.children).toEqual(3);

    result = shallowRenderer.render(
      <SimpleComponent updateState={false} incrementBy={2} />
    ) as VNode<any>;
    expect(result.props.children).toEqual(3);
  });

  it('should not override state with stale values if prevState is spread within getDerivedStateFromProps', () => {
    type Props = {};
    type State = { value: number };
    const SimpleComponent = memo(
      class SimpleComponent extends Component<Props, State> {
        state = { value: 0 };

        static getDerivedStateFromProps(nextProps: Props, prevState: State) {
          return { ...prevState };
        }

        updateState = () => {
          this.setState(state => ({ value: state.value + 1 }));
        };

        render() {
          return <div>{`value:${this.state.value}`}</div>;
        }
      }
    );

    const shallowRenderer = createRenderer();
    let result = shallowRenderer.render(<SimpleComponent />);
    expect(result).toEqual(<div>value:0</div>);

    const instance = shallowRenderer.getMountedInstance() as any;
    instance.updateState();
    result = shallowRenderer.getRenderOutput();
    expect(result).toEqual(<div>value:1</div>);
  });

  it('should pass previous state to shouldComponentUpdate even with getDerivedStateFromProps', () => {
    type Props = { value: string };
    type State = { value: string };
    const SimpleComponent = memo(
      class SimpleComponent extends Component<Props, State> {
        constructor(props: Props) {
          super(props);
          this.state = {
            value: props.value,
          };
        }

        static getDerivedStateFromProps(nextProps: Props, prevState: State) {
          if (nextProps.value === prevState.value) {
            return null;
          }
          return { value: nextProps.value };
        }

        shouldComponentUpdate(nextProps: Props, nextState: State) {
          return nextState.value !== this.state.value;
        }

        render() {
          return <div>{`value:${this.state.value}`}</div>;
        }
      }
    );

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
    let instance: any;

    type Props = { defaultCount: number };
    type State = { counter: number };
    const SimpleComponent = memo(
      class SimpleComponent extends Component<Props, State> {
        state = {
          counter: 0,
        };

        render() {
          instance = this;
          return (
            // @ts-ignore Preserve the test as written here
            <button ref="button" onClick={this.onClick}>
              {this.state.counter}
            </button>
          );
        }
      }
    );

    const shallowRenderer = createRenderer();
    let result = shallowRenderer.render(
      <SimpleComponent defaultCount={1} />
    ) as VNode<any>;
    expect(result.props.children).toEqual(0);

    instance.setState((state: State, props: Props) => {
      return { counter: props.defaultCount + 1 };
    });

    result = shallowRenderer.getRenderOutput() as VNode<any>;
    expect(result.props.children).toEqual(2);
  });

  // Preact doesn't invoke setState updater functions with a this context
  it.skip('can access component instance from setState updater function', done => {
    let instance: any;

    const SimpleComponent = memo(
      class SimpleComponent extends Component<{}, {}> {
        state = {};

        render() {
          instance = this;
          return null;
        }
      }
    );

    const shallowRenderer = createRenderer();
    shallowRenderer.render(<SimpleComponent />);

    instance.setState(function updater(this: any, state: any, props: any) {
      expect(this).toBe(instance);
      done();
    });
  });

  it('can setState with a callback', () => {
    let instance: any;

    const SimpleComponent = memo(
      class SimpleComponent extends Component {
        state = {
          counter: 0,
        };
        render() {
          instance = this;
          return <p>{this.state.counter}</p>;
        }
      }
    );

    const shallowRenderer = createRenderer();
    const result = shallowRenderer.render(<SimpleComponent />) as VNode<any>;
    expect(result.props.children).toBe(0);

    const callback = sinon.spy(function (this: any) {
      expect(this).toBe(instance);
    });

    instance.setState({ counter: 1 }, callback);

    const updated = shallowRenderer.getRenderOutput() as VNode<any>;
    expect(updated.props.children).toBe(1);
    expect(callback).toHaveBeenCalled();
  });

  // Removing test for not-supported React API
  /*
  it.skip('can replaceState with a callback', () => {
    let instance: any;

    const SimpleComponent = memo(
      class SimpleComponent extends Component {
        state = {
          counter: 0,
        };
        render() {
          instance = this;
          return <p>{this.state.counter}</p>;
        }
      }
    );

    const shallowRenderer = createRenderer();
    const result = shallowRenderer.render(<SimpleComponent />) as VNode<any>;
    expect(result.props.children).toBe(0);

    const callback = sinon.spy(function (this: any) {
      expect(this).toBe(instance);
    });

    // No longer a public API, but we can test that it works internally by
    // reaching into the updater.
    (shallowRenderer as any)._updater.enqueueReplaceState(
      instance,
      { counter: 1 },
      callback
    );

    const updated = shallowRenderer.getRenderOutput() as VNode<any>;
    expect(updated.props.children).toBe(1);
    expect(callback).toHaveBeenCalled();
  });
  */

  it('can forceUpdate with a callback', () => {
    let instance: any;

    type State = { counter: number };
    const SimpleComponent = memo(
      class SimpleComponent extends Component<{}, State> {
        state = {
          counter: 0,
        };
        render() {
          instance = this;
          return <p>{this.state.counter}</p>;
        }
      }
    );

    const shallowRenderer = createRenderer();
    const result = shallowRenderer.render(<SimpleComponent />) as VNode<any>;
    expect(result.props.children).toBe(0);

    const callback = sinon.spy(function (this: any) {
      expect(this).toBe(instance);
    });

    instance.forceUpdate(callback);

    const updated = shallowRenderer.getRenderOutput() as VNode<any>;
    expect(updated.props.children).toBe(0);
    expect(callback).toHaveBeenCalled();
  });

  it('can pass context when shallowly rendering', () => {
    const SimpleComponent = memo(
      class SimpleComponent extends Component {
        static contextTypes: any = {
          name: PropTypes.string,
        };

        render() {
          return <div>{this.context.name}</div>;
        }
      }
    );

    const shallowRenderer = createRenderer();
    const result = shallowRenderer.render(<SimpleComponent />, {
      name: 'foo',
    });
    expect(result).toEqual(<div>foo</div>);
  });

  it('should track context across updates', () => {
    const SimpleComponent = memo(
      class SimpleComponent extends Component {
        static contextTypes: any = {
          foo: PropTypes.string,
        };

        state = {
          bar: 'bar',
        };

        render() {
          return <div>{`${this.context.foo}:${this.state.bar}`}</div>;
        }
      }
    );

    const shallowRenderer = createRenderer();
    let result = shallowRenderer.render(<SimpleComponent />, {
      foo: 'foo',
    });
    expect(result).toEqual(<div>foo:bar</div>);

    const instance = shallowRenderer.getMountedInstance()!;
    instance.setState({ bar: 'baz' });

    result = shallowRenderer.getRenderOutput();
    expect(result).toEqual(<div>foo:baz</div>);
  });

  // Preact doesn't support this contextTypes
  it.skip('should filter context by contextTypes', () => {
    const SimpleComponent = memo(
      class SimpleComponent extends Component {
        static contextTypes: any = {
          foo: PropTypes.string,
        };
        render() {
          return <div>{`${this.context.foo}:${this.context.bar}`}</div>;
        }
      }
    );

    const shallowRenderer = createRenderer();
    const result = shallowRenderer.render(<SimpleComponent />, {
      foo: 'foo',
      bar: 'bar',
    });
    expect(result).toEqual(<div>foo:undefined</div>);
  });

  // Preact doesn't support this contextTypes
  it.skip('can fail context when shallowly rendering', () => {
    const SimpleComponent = memo(
      class SimpleComponent extends Component {
        static contextTypes: any = {
          name: PropTypes.string.isRequired,
        };

        render() {
          return <div>{this.context.name}</div>;
        }
      }
    );

    const shallowRenderer = createRenderer();
    expect(() => shallowRenderer.render(<SimpleComponent />)).toErrorDev(
      'Warning: Failed context type: The context `name` is marked as ' +
        'required in `SimpleComponent`, but its value is `undefined`.\n' +
        '    in SimpleComponent (at **)'
    );
  });

  // Preact only validates prop types when preact/debug is included
  it.skip('should warn about propTypes (but only once)', () => {
    const SimpleComponent = memo(
      class SimpleComponent extends Component<{ name: any }> {
        static propTypes: any = {
          name: PropTypes.string.isRequired,
        };

        render() {
          return createElement('div', null, this.props.name);
        }
      }
    );

    const shallowRenderer = createRenderer();
    expect(() =>
      shallowRenderer.render(createElement(SimpleComponent, { name: 123 }))
    ).toErrorDev(
      'Warning: Failed prop type: Invalid prop `name` of type `number` ' +
        'supplied to `SimpleComponent`, expected `string`.\n' +
        '    in SimpleComponent'
    );
  });

  it('should enable rendering of cloned element', () => {
    type Props = { foo: string };
    type State = { bar: string };
    const SimpleComponent = memo(
      class SimpleComponent extends Component<Props, State> {
        constructor(props: Props) {
          super(props);

          this.state = {
            bar: 'bar',
          };
        }

        render() {
          return <div>{`${this.props.foo}:${this.state.bar}`}</div>;
        }
      }
    );

    const shallowRenderer = createRenderer();
    const el = <SimpleComponent foo="foo" />;
    let result = shallowRenderer.render(el);
    expect(result).toEqual(<div>foo:bar</div>);

    const cloned = cloneElement(el, { foo: 'baz' });
    result = shallowRenderer.render(cloned);
    expect(result).toEqual(<div>baz:bar</div>);
  });

  // TODO: Renable when preactjs/preact#3806 is released
  it.skip('this.state should be updated on setState callback inside componentWillMount', () => {
    let stateSuccessfullyUpdated = false;

    type Props = {};
    type State = { hasUpdatedState: boolean };
    const SomeComponent = memo(
      class SomeComponent extends Component<Props, State> {
        constructor(props: Props, context: any) {
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
    );

    const shallowRenderer = createRenderer();
    shallowRenderer.render(<SomeComponent />);
    expect(stateSuccessfullyUpdated).toBe(true);
  });

  // TODO: Renable when preactjs/preact#3806 is released
  it.skip('should handle multiple callbacks', () => {
    const mockFn = sinon.spy();
    const shallowRenderer = createRenderer();

    type Props = {};
    type State = { foo: string };
    const SomeComponent = memo(
      class SomeComponent extends Component<Props, State> {
        constructor(props: Props, context: any) {
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
    );

    shallowRenderer.render(<SomeComponent />);

    expect(mockFn).toHaveBeenCalledTimes(2);

    // Ensure the callback queue is cleared after the callbacks are invoked
    const mountedInstance = shallowRenderer.getMountedInstance()!;
    mountedInstance.setState({ foo: 'bar' }, () => mockFn());
    expect(mockFn).toHaveBeenCalledTimes(3);
  });

  it('should call the setState callback even if shouldComponentUpdate = false', done => {
    const mockFn = sinon.spy(() => false);

    type Props = {};
    type State = { hasUpdatedState: boolean };
    const SomeComponent = memo(
      class SomeComponent extends Component<Props, State> {
        constructor(props: Props, context: any) {
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
    );

    const shallowRenderer = createRenderer();
    shallowRenderer.render(<SomeComponent />);

    const mountedInstance = shallowRenderer.getMountedInstance()!;
    mountedInstance.setState({ hasUpdatedState: true }, () => {
      expect(mockFn).toBeCalled();
      expect(mountedInstance.state.hasUpdatedState).toBe(true);
      done();
    });
  });

  it('throws usefully when rendering badly-typed elements', () => {
    const shallowRenderer = createRenderer();

    const renderAndVerifyWarningAndError = (
      SomeComponent: any,
      typeString: any
    ) => {
      expect(() => {
        shallowRenderer.render(<SomeComponent />);
        // Preact doesn't support dev time only errors outside of preact/debug
        // expect(() => shallowRenderer.render(<SomeComponent />)).toErrorDev(
        //   'createElement: type is invalid -- expected a string ' +
        //     '(for built-in components) or a class/function (for composite components) ' +
        //     `but got: ${typeString}.`
        // );
      }).toThrowError(
        'Preact10ShallowDiff render(): Shallow rendering works only with custom ' +
          `components, but the provided element type was \`${typeString}\`.`
      );
    };

    renderAndVerifyWarningAndError(undefined, 'undefined');
    renderAndVerifyWarningAndError(null, 'null');
    renderAndVerifyWarningAndError([], 'array');
    renderAndVerifyWarningAndError({}, 'object');
  });

  // Preact always initializes state to empty obj
  it.skip('should have initial state of null if not defined', () => {
    const SomeComponent = memo(
      class SomeComponent extends Component {
        render() {
          return <span />;
        }
      }
    );

    const shallowRenderer = createRenderer();
    shallowRenderer.render(<SomeComponent />);

    expect(shallowRenderer.getMountedInstance()!.state).toBeNull();
  });

  // Preact does not invoke both methods. Both should never be defined
  it.skip('should invoke both deprecated and new lifecycles if both are present', () => {
    const log: string[] = [];

    const SomeComponent = memo(
      class SomeComponent extends Component<{ foo: string }> {
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
    );

    const shallowRenderer = createRenderer();
    shallowRenderer.render(<SomeComponent foo="bar" />);
    expect(log).toEqual(['componentWillMount', 'UNSAFE_componentWillMount']);

    log.length = 0;

    shallowRenderer.render(<SomeComponent foo="baz" />);
    expect(log).toEqual([
      'componentWillReceiveProps',
      'UNSAFE_componentWillReceiveProps',
      'componentWillUpdate',
      'UNSAFE_componentWillUpdate',
    ]);
  });

  it('should stop the update when setState returns null or undefined', () => {
    const log: string[] = [];
    type State = { count: number };
    let instance: preact.Component<{}, State> = null as any;
    const SomeComponent = memo(
      class SomeComponent extends Component<{}, State> {
        constructor(props: any) {
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
    );
    const shallowRenderer = createRenderer();
    shallowRenderer.render(<SomeComponent />);
    log.length = 0;
    instance.setState(() => null);
    instance.setState(() => undefined);
    instance.setState(null);
    instance.setState(undefined as any);
    expect(log).toEqual([]);
    instance.setState(state => ({ count: state.count + 1 }));
    expect(log).toEqual(['render']);
  });

  // Preact 10 does set this for Function components
  it.skip('should not get this in a function component', () => {
    const logs: any[] = [];
    const Foo = memo(function Foo(this: any, props: any) {
      logs.push(this);
      return <div>foo</div>;
    });
    const shallowRenderer = createRenderer();
    shallowRenderer.render(<Foo foo="bar" />);
    expect(logs).toEqual([undefined]);
  });
});
