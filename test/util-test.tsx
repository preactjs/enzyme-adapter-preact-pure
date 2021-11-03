import { assert } from 'chai';
import { NodeType } from 'enzyme';

import { getDisplayName } from '../src/util.js';

describe('util', () => {
  describe('getDisplayName', () => {
    const baseNode = {
      rendered: [],
      key: null,
      ref: null,
      instance: null,
      props: {},
    };

    it('returns expected display name for host nodes', () => {
      const rstNode = {
        ...baseNode,
        nodeType: 'host' as NodeType,
        type: 'div',
      };
      assert.equal(getDisplayName(rstNode), 'div');
    });

    it('returns expected display name for component nodes', () => {
      function Button() {
        return null;
      }
      const rstNode = {
        ...baseNode,
        nodeType: 'function' as NodeType,
        type: Button,
      };

      assert.equal(getDisplayName(rstNode), 'Button');

      Button.displayName = 'Fancy Button';

      assert.equal(getDisplayName(rstNode), 'Fancy Button');
    });
  });
});
