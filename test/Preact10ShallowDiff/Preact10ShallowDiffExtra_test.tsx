// This test file contains additional tests for our shallow differ that aren't
// taken from the react-shallow-renderer tests suite. We put it in its own file
// so it is easier to update and copy over tests from react-shallow-renderer.

import * as preact from 'preact/compat';
import type { ComponentType } from 'preact';
import sinon from 'sinon';

import Preact10ShallowDiff from '../../src/Preact10ShallowDiff.js';
import { expect, installVNodeTestHook } from './utils.js';

const { Component, memo: realMemo } = preact;
const createRenderer = Preact10ShallowDiff.createRenderer;

function memo<T extends ComponentType<any>>(component: T): T {
  return realMemo<T>(component as any) as any;
}

describe('Preact10ShallowDiff extra', () => {
  installVNodeTestHook();

  function createLifecycleComponent(displayName = 'SomeComponent') {
    class SomeComponent extends Component<{ name?: string }> {
      shouldComponentUpdate() {
        return true;
      }
      componentWillReceiveProps() {}
      componentWillMount() {}
      componentWillUpdate() {}
      componentDidMount() {}
      componentDidUpdate() {}
      componentWillUnmount() {}

      render() {
        return <div>Hello {this.props.name ?? displayName}</div>;
      }
    }

    SomeComponent.displayName = displayName;

    sinon.stub(SomeComponent.prototype, 'shouldComponentUpdate').returns(true);
    sinon.stub(SomeComponent.prototype, 'componentWillReceiveProps');
    sinon.stub(SomeComponent.prototype, 'componentWillMount');
    sinon.stub(SomeComponent.prototype, 'componentWillUpdate');
    sinon.stub(SomeComponent.prototype, 'componentDidMount');
    sinon.stub(SomeComponent.prototype, 'componentDidUpdate');
    sinon.stub(SomeComponent.prototype, 'componentWillUnmount');

    return SomeComponent;
  }

  const expectLifecycleCalled =
    (SomeComponent: any) => (methodName: string) => {
      const proto = SomeComponent.prototype as any;
      expect(proto[methodName]).toHaveBeenCalled();
    };

  const expectLifecycleNotCalled =
    (SomeComponent: any) => (methodName: string) => {
      const proto = SomeComponent.prototype as any;
      expect(proto[methodName]).not.toHaveBeenCalled();
    };

  function resetLifecycleHistory(SomeComponent: any) {
    [
      'componentWillMount',
      'shouldComponentUpdate',
      'componentWillReceiveProps',
      'componentWillUpdate',
      'componentDidMount',
      'componentDidUpdate',
      'componentWillUnmount',
    ].forEach(method => SomeComponent.prototype[method].resetHistory());
  }

  it('renders through multiple memo components', () => {
    const SomeComponent = createLifecycleComponent();
    // Not sure if this is allowed in React, but technically Preact allows
    const DoubleMemoed = memo(memo(SomeComponent));

    const renderer = createRenderer();
    const output = renderer.render(<DoubleMemoed />);
    expect(output).toEqual(<div>Hello {'SomeComponent'}</div>);
    expect(renderer.getRenderOutput()).toEqual(
      <div>Hello {'SomeComponent'}</div>
    );
    expect(renderer.getMountedInstance()?.constructor).toBe(SomeComponent);
  });

  it('can update and unmount a memoed component', () => {
    const SomeComponent = createLifecycleComponent();
    const Memoed = memo(SomeComponent);

    const renderer = createRenderer();
    let output = renderer.render(<Memoed name="Earth" />);

    expect(output).toEqual(<div>Hello {'Earth'}</div>);
    ['componentWillMount'].forEach(expectLifecycleCalled(SomeComponent));
    [
      'shouldComponentUpdate',
      'componentWillReceiveProps',
      'componentWillUpdate',
      'componentDidMount',
      'componentDidUpdate',
      'componentWillUnmount',
    ].forEach(expectLifecycleNotCalled(SomeComponent));

    resetLifecycleHistory(SomeComponent);
    output = renderer.render(<Memoed name="Universe" />);

    expect(output).toEqual(<div>Hello {'Universe'}</div>);
    [
      'shouldComponentUpdate',
      'componentWillReceiveProps',
      'componentWillUpdate',
    ].forEach(expectLifecycleCalled(SomeComponent));
    [
      'componentWillMount',
      'componentDidMount',
      'componentDidUpdate',
      'componentWillUnmount',
    ].forEach(expectLifecycleNotCalled(SomeComponent));

    resetLifecycleHistory(SomeComponent);
    renderer.unmount();

    ['componentWillUnmount'].forEach(expectLifecycleCalled(SomeComponent));
    [
      'componentWillMount',
      'shouldComponentUpdate',
      'componentWillReceiveProps',
      'componentWillUpdate',
      'componentDidMount',
      'componentDidUpdate',
    ].forEach(expectLifecycleNotCalled(SomeComponent));
  });

  it('changes between two memoed components', () => {
    const SomeComponent1 = createLifecycleComponent('SomeComponent1');
    const SomeComponent2 = createLifecycleComponent('SomeComponent2');
    const Memo1 = memo(SomeComponent1);
    const Memo2 = memo(SomeComponent2);

    const renderer = createRenderer();
    let output = renderer.render(<Memo1 />);

    expect(output).toEqual(<div>Hello {'SomeComponent1'}</div>);
    expect(SomeComponent1.prototype.componentWillMount).toHaveBeenCalled();
    expect(SomeComponent1.prototype.componentWillUpdate).not.toHaveBeenCalled();
    expect(SomeComponent2.prototype.componentWillMount).not.toHaveBeenCalled();
    expect(SomeComponent2.prototype.componentWillUpdate).not.toHaveBeenCalled();

    resetLifecycleHistory(SomeComponent1);
    resetLifecycleHistory(SomeComponent2);
    output = renderer.render(<Memo2 />);

    expect(output).toEqual(<div>Hello {'SomeComponent2'}</div>);
    expect(SomeComponent1.prototype.componentWillMount).not.toHaveBeenCalled();
    expect(SomeComponent1.prototype.componentWillUpdate).not.toHaveBeenCalled();
    expect(SomeComponent2.prototype.componentWillMount).toHaveBeenCalled();
    expect(SomeComponent2.prototype.componentWillUpdate).not.toHaveBeenCalled();
  });

  it("renderer public methods return expected data when a memo component doesn't change", () => {
    class App extends Component {
      render() {
        return <div>Hello World</div>;
      }
    }

    const MemoedApp = memo(App);

    const renderer = createRenderer();
    let output = renderer.render(<MemoedApp />);

    const expectedOutput = <div>Hello World</div>;
    expect(output).toEqual(expectedOutput);
    expect(renderer.getRenderOutput()).toEqual(expectedOutput);
    expect(renderer.getMountedInstance()?.constructor).toBe(App);

    output = renderer.render(<MemoedApp />);

    expect(output).toEqual(expectedOutput);
    expect(renderer.getRenderOutput()).toEqual(expectedOutput);
    expect(renderer.getMountedInstance()?.constructor).toBe(App);
  });
});
