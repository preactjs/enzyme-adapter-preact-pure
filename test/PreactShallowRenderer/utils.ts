import { assert } from 'chai';
import { options } from 'preact';
import type { VNode } from 'preact';
import sinon from 'sinon';

// These tests are from react-shallow-renderer which uses Jest for testing, so
// here is a lightweight adapter around `chai` to give it the same API as Jest's
// `expect` so we don't have to rewrite all the `expect` statements to `assert`
export function expect<T>(actual: T) {
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

export function installVNodeTestHook() {
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
}
