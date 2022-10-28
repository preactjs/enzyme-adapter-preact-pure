import type { VNode } from 'preact';
import { Fragment, cloneElement } from 'preact';
import { assert } from 'chai';
import * as preact from 'preact';

import {
  getRealType,
  withShallowRendering,
  isShallowRendered,
  shallowRenderVNodeTree,
} from '../src/shallow-render-utils.js';
import { componentForDOMNode, render, childElements } from '../src/compat.js';
import {
  getChildren,
  getComponent,
  getLastRenderOutput,
  getLastVNodeRenderedIntoContainer,
} from '../src/preact10-internals.js';

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
      let shallowOutput = 'Hello';

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

    it('does not shallow-render fragments', () => {
      const el = (
        <ul>
          <Fragment>
            <li>1</li>
          </Fragment>
        </ul>
      );
      render(el, container);
      assert.equal(container.innerHTML, '<ul><li>1</li></ul>');
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

      const fragVNode = getLastVNodeRenderedIntoContainer(container);
      const rootComponent = getComponent(getChildren(fragVNode)![0])!;
      const rootOutput = getLastRenderOutput(rootComponent)[0];
      const childComponent = getComponent(getChildren(rootOutput)![1])!;

      assert.ok(childComponent);
      assert.equal(childComponent instanceof Child, false);
      assert.equal(getRealType(childComponent), Child);
    });
  });

  describe('shallowRenderVNodeTree', () => {
    it('modifies nodes to shallow-render', () => {
      const Parent: any = () => {
        return null;
      };
      function Child() {
        return null;
      }
      const el = (
        <Parent>
          <Child />
        </Parent>
      );
      const childEl = childElements(el)[0] as VNode;

      assert.isFalse(isShallowRendered(el));
      assert.isFalse(isShallowRendered(childEl));

      shallowRenderVNodeTree(el);

      assert.isTrue(isShallowRendered(el));
      assert.isTrue(isShallowRendered(childEl));
    });
  });
});
