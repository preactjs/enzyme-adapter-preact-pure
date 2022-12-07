import { assert } from 'chai';
import { Fragment, options } from 'preact';
import type { VNode } from 'preact';
import sinon from 'sinon';

// This makes enzyme debug output easier to work with by giving Fragments a name that isn't minified
Fragment.displayName = 'Fragment';

// These tests are from react-shallow-renderer which uses Jest for testing, so
// here is a lightweight adapter around `chai` to give it the same API as Jest's
// `expect` so we don't have to rewrite all the `expect` statements to `assert`
function createMatcher<T>(actual: T, negate = false) {
  return {
    toBe(expected: T) {
      if (negate) {
        assert.notEqual(actual, expected);
      } else {
        assert.equal(actual, expected);
      }
    },
    toEqual(expected: T) {
      if (negate) {
        assert.notDeepEqual(actual, expected);
      } else {
        assert.deepEqual(actual, expected);
      }
    },
    toBeNull() {
      if (negate) {
        assert.isNotNull(actual);
      } else {
        assert.isNull(actual);
      }
    },
    toThrowError(expected: string) {
      if (negate) {
        assert.doesNotThrow(actual as any, expected);
      } else {
        assert.throws(actual as any, expected);
      }
    },
    toErrorDev(expected: any, options?: any) {
      if (negate) {
        assert.doesNotThrow(actual as any, expected);
      } else {
        assert.throws(actual as any, expected);
      }
    },
    toBeCalled() {
      if (negate) {
        sinon.assert.notCalled(actual as any);
      } else {
        sinon.assert.called(actual as any);
      }
    },
    toHaveBeenCalled() {
      if (negate) {
        sinon.assert.notCalled(actual as any);
      } else {
        sinon.assert.called(actual as any);
      }
    },
    toHaveBeenCalledTimes(count: number) {
      if (negate) {
        throw new Error(`.not.toHaveBeenCalledTimes is not supported`);
      } else {
        sinon.assert.callCount(actual as any, count);
      }
    },
  };
}

type Matchers = ReturnType<typeof createMatcher>;
type ExpectMatchers = Matchers & { not: Matchers };

export function expect<T>(actual: T): ExpectMatchers {
  const matchers: ExpectMatchers = createMatcher(actual) as any;
  matchers.not = createMatcher(actual, true);

  return matchers;
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
      // The Preact renderer uses `__v` to shortcut diffing VNodes that haven't
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
      // render them normally (it won't shortcut it), but assert.deepEqual will
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
