import { cloneElement, h, options } from 'preact';
import { assert } from 'chai';

import { getRealType, withShallowRendering } from '../src/shallow-render-utils';
import { componentForDOMNode, render } from '../src/compat';

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
      render(el, container);
      assert.equal(container.firstElementChild!.innerHTML, fullOutput);

      // Within the `withShallowRendering` callback, render should replace
      // child components with dummy elements.
      //
      // Note that the root element to render must be created outside of the
      // `withShallowRendering` callback, otherwise nothing gets rendered.
      //
      // nb. With Preact 10 it is necessary to render a new VNode with the same
      // value here.
      const el2 = cloneElement(el, {});
      withShallowRendering(() => {
        render(el2, container);
        assert.equal(container.firstElementChild!.innerHTML, shallowOutput);
      });

      // After the `withShallowRendering` call, render should return full output
      // again.
      render(el, container);
      assert.equal(container.firstElementChild!.innerHTML, fullOutput);
    });
  });

  describe('getRealType', () => {
    it('returns null if component is not shallow-rendered', () => {
      const el = <Component />;
      render(el, container);
      const component = componentForDOMNode(container.firstElementChild!)!;
      assert.ok(component);
      assert.equal(getRealType(component), null);
    });

    it('returns the real type of a shallow-rendered component', () => {
      const el = <Component />;

      withShallowRendering(() => {
        render(el, container);
      });
      const child = container.querySelector('shallow-render')!;
      const childComponent = componentForDOMNode(child)!;
      assert.ok(childComponent);
      assert.equal(childComponent instanceof Child, false);
      assert.equal(getRealType(childComponent), Child);
    });
  });
});
