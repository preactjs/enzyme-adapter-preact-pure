import { assert } from 'chai';
import { h, render } from 'preact';
import { NodeType } from 'enzyme';

import { PreactNode } from '../src/preact-internals';
import {
  getDisplayName,
  rstNodeFromDOMElementOrComponent,
} from '../src/rst-node';

describe('rst-node', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
  });

  afterEach(() => {
    container.remove();
  });

  function Component({ label }: any) {
    return <div>{label}</div>;
  }

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

  describe('rstNodeFromDOMElementOrComponent', () => {
    it('converts DOM tree into RST nodes', () => {
      const el = (render(
        <Component label="foo" />,
        container
      ) as unknown) as PreactNode;
      const rstNode = rstNodeFromDOMElementOrComponent(el);

      assert.deepEqual(rstNode, {
        nodeType: 'function',
        type: Component,
        props: {
          children: [],
          label: 'foo',
        },
        key: null,
        ref: null,
        instance: el._component,
        rendered: [
          {
            nodeType: 'host',
            type: 'div',
            props: { children: [] },
            key: null,
            ref: null,
            instance: el,
            rendered: ['foo'],
          },
        ],
      });
    });
  });
});
