import { assert } from 'chai';
import { HelloWorld } from '../src/index.js';

describe('HelloWorld', () => {
  it('exports hello world', () => {
    assert.equal(HelloWorld, 1);
  });
});
