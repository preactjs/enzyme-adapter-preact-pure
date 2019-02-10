import { assert } from 'chai';
import { h, render } from 'preact';

import { PreactNode } from '../src/preact-internals';
import { rstNodeFromDOMElementOrComponent } from '../src/rst-node';

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
