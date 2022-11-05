// @ts-ignore
import describeMethods from './enzyme-test-suite/build/_helpers/describeMethods.js';

import enzyme from 'enzyme';
import Adapter from '../src/Adapter.js';

const { configure, shallow, mount, ShallowWrapper, ReactWrapper } = enzyme;

configure({
  adapter: new Adapter({
    preserveFragmentsInShallowRender: true,
    simulateEventsOnComponents: true,
  }),
});

describe.only('shallow methods', () => {
  describeMethods(
    { Wrap: shallow, Wrapper: ShallowWrapper },
    // 'deprecatedInstanceProperties',
    // '@@iterator',
    'at',
    'childAt',
    'children',
    'closest',
    // 'contains',
    // 'containsAllMatchingElements',
    // 'containsAnyMatchingElements',
    // 'containsMatchingElement',
    // 'context',
    // 'debug',
    // 'equals',
    'every',
    'everyWhere',
    'exists',
    'filter',
    'filterWhere',
    // 'find',
    // 'findWhere',
    'first',
    'flatMap',
    'forEach',
    // 'get',
    // 'getElement',
    // 'getElements',
    'getNode',
    'getNodes',
    // 'getWrappingComponent',
    // 'hasClass',
    // 'hostNodes',
    'html',
    // 'instance',
    'invoke',
    'is',
    // 'isEmpty',
    // 'isEmptyRender',
    // 'key',
    'last',
    'map',
    // 'matchesElement',
    'name',
    'not',
    'parent',
    // 'parents',
    'prop',
    // 'props',
    'reduce',
    'reduceRight',
    'render',
    // 'renderProp',
    'root',
    // 'setContext',
    // 'setProps',
    // 'setState',
    // 'simulate',
    // 'simulateError',
    'single',
    'slice',
    'some',
    'someWhere',
    'state',
    'tap',
    // 'text',
    'unmount'
    // 'wrap'
  );
});
