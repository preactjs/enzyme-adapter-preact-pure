/**
 * Largely taken and adapted from react-shallow-renderer, which is copyrighted
 * to Facebook and licensed under the MIT License, found a the link below:
 * https://github.com/enzymejs/react-shallow-renderer/blob/802c735ee53bf2d965797760698cacbd46088f66/LICENSE
 */

import { assert } from 'chai';
import * as preact from 'preact/compat';
import PreactShallowRenderer from '../src/PreactShallowRenderer.js';

const createRenderer = PreactShallowRenderer.createRenderer;

describe.only('PreactShallowRenderer', () => {
  it('should call all of the legacy lifecycle hooks', () => {
    const logs: string[] = [];
    const logger = (message: string) => () => {
      logs.push(message);
      return true;
    };

    class SomeComponent extends preact.Component<{ foo?: number }> {
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
    assert.deepEqual(logs, ['componentWillMount']);

    logs.splice(0);

    const instance = shallowRenderer.getMountedInstance()!;
    instance.setState({});

    assert.deepEqual(logs, ['shouldComponentUpdate', 'componentWillUpdate']);

    logs.splice(0);

    shallowRenderer.render(<SomeComponent foo={2} />);

    // The previous shallow renderer did not trigger cDU for props changes.
    assert.deepEqual(logs, [
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

    class SomeComponent extends preact.Component<{ foo?: number }> {
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
    assert.deepEqual(logs, ['getDerivedStateFromProps']);

    logs.splice(0);

    const instance = shallowRenderer.getMountedInstance()!;
    instance.setState({});

    assert.deepEqual(logs, [
      'getDerivedStateFromProps',
      'shouldComponentUpdate',
    ]);

    logs.splice(0);

    shallowRenderer.render(<SomeComponent foo={2} />);

    // The previous shallow renderer did not trigger cDU for props changes.
    assert.deepEqual(logs, [
      'getDerivedStateFromProps',
      'shouldComponentUpdate',
    ]);
  });

  it('should not invoke deprecated lifecycles (cWM/cWRP/cWU) if new static gDSFP is present', () => {
    class Component extends preact.Component {
      state = {};
      static getDerivedStateFromProps() {
        return null;
      }
      componentWillMount() {
        throw Error('unexpected cWM');
      }
      componentWillReceiveProps() {
        throw Error('unexpected cWRP');
      }
      componentWillUpdate() {
        throw Error('unexpected cWU');
      }
      render() {
        return null;
      }
    }

    const shallowRenderer = createRenderer();
    shallowRenderer.render(<Component />);
  });

  // TODO: Make a note that preact does do this
  it.skip('should not invoke deprecated lifecycles (cWM/cWRP/cWU) if new getSnapshotBeforeUpdate is present', () => {
    class Component extends preact.Component<{ value: number }> {
      getSnapshotBeforeUpdate() {
        return null;
      }
      componentWillMount() {
        throw Error('unexpected cWM');
      }
      componentWillReceiveProps() {
        throw Error('unexpected cWRP');
      }
      componentWillUpdate() {
        throw Error('unexpected cWU');
      }
      render() {
        return null;
      }
    }

    const shallowRenderer = createRenderer();
    shallowRenderer.render(<Component value={1} />);
    shallowRenderer.render(<Component value={2} />);
  });

  it('should not call getSnapshotBeforeUpdate or componentDidUpdate when updating since refs wont exist', () => {
    class Component extends preact.Component<{ value: number }> {
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
    shallowRenderer.render(<Component value={1} />);
    shallowRenderer.render(<Component value={2} />);
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
    shallowRenderer.render(preact.createElement(Parent, null));
  });

  it('should have shallow rendering', () => {
    class SomeComponent extends preact.Component {
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
    const result = shallowRenderer.render(<SomeComponent />) as JSX.Element;

    assert.equal(result.type, 'div');
    assert.deepEqual(result.props.children, [
      <span className="child1" />,
      <span className="child2" />,
    ]);
  });
});
