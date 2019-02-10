import { h, options, render } from 'preact';
import { assert } from 'chai';

import { PreactNode } from '../src/preact-internals';
import { getRealType, withShallowRendering } from '../src/shallow-render-utils';

describe('shallow-render-utils', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
  });

  afterEach(() => {
    container.remove();
  });

  function Child() {
    return <span>world</span>;
  }
  function Component() {
    return (
      <div>
        Hello
        <Child />
      </div>
    );
  }

  describe('withShallowRendering', () => {
    it('replaces child components with placeholders', () => {
      const fullOutput = 'Hello<span>world</span>';
      const shallowOutput =
        'Hello<shallow-render component="Child"></shallow-render>';

      // Normal render should return full output.
      const el = <Component />;
      let node = render(el, container);
      assert.equal(node.innerHTML, fullOutput);

      // Within the `withShallowRendering` callback, render should replace
      // child components with dummy elements.
      //
      // Note that the root element to render must be created outside of the
      // `withShallowRendering` callback, otherwise nothing gets rendered.
      withShallowRendering(() => {
        node = render(el, container, node);
        assert.equal(node.innerHTML, shallowOutput);
      });

      // After the `withShallowRendering` call, render should return full output
      // again.
      node = render(el, container, node);
      assert.equal(node.innerHTML, fullOutput);
    });
  });

  describe('getRealType', () => {
    it('returns null if component is not shallow-rendered', () => {
      const el = <Component />;
      const node = (render(el, container) as unknown) as PreactNode;
      assert.equal(getRealType(node._component), null);
    });

    it('returns the real type of a shallow-rendered component', () => {
      const el = <Component />;
      let node: Element;

      withShallowRendering(() => {
        node = render(el, container) as any;
      });
      const child = (node!.querySelector(
        'shallow-render'
      ) as unknown) as PreactNode;

      assert.equal(child._component instanceof Child, false);
      assert.equal(getRealType(child._component), Child);
    });
  });
});
