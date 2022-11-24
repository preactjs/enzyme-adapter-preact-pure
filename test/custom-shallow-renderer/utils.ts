import { assert } from 'chai';
import sinon from 'sinon';

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
