import type { VNode } from 'preact';
import { Component as PreactComponent, Fragment, cloneElement } from 'preact';
import { assert } from 'chai';
import * as preact from 'preact';

import {
  getRealType,
  withShallowRendering,
  isShallowRendered,
  shallowRenderVNodeTree,
  patchShallowRoot,
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
      const shallowOutput = 'Hello';

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

  describe('patchShallowRoot', () => {
    it('class component static properties are preserved', () => {
      class C extends PreactComponent<{ name?: string }> {
        static defaultProps = { name: 'World' };
        render() {
          return <div>Hello {this.props.name}!</div>;
        }
      }

      const element = <C />;
      const initialType = element.type as unknown as typeof C;
      const initialRender = C.prototype.render;
      assert.equal(initialType.defaultProps?.name, 'World');

      patchShallowRoot(element);

      const elementType = element.type as unknown as typeof C;
      assert.notEqual(elementType.prototype.render, initialRender);
      assert.equal(elementType.defaultProps.name, 'World');
    });

    it('function component static properties are preserved', () => {
      function C(props: { name?: string }) {
        return <div>Hello {props.name}!</div>;
      }
      C.displayName = 'CC';
      C.defaultProps = { name: 'World' };

      const element = <C />;
      const initialType = element.type as typeof C;
      assert.equal(initialType.displayName, 'CC');
      assert.equal(initialType.defaultProps.name, 'World');

      patchShallowRoot(element);

      const newType = element.type as typeof C;
      assert.notEqual(newType, C);
      assert.equal(newType.displayName, 'CC');
      assert.equal(newType.defaultProps.name, 'World');
    });

    it('defaults function wrapper display name to the name of the wrapped component', () => {
      function C1() {
        return <div>Hello</div>;
      }

      const element = <C1 />;
      const initialType = element.type as any;
      assert.notExists(initialType.displayName);

      patchShallowRoot(element);

      const newType = element.type as any;
      assert.equal(newType.displayName, 'C1');
    });

    it('only patches a VNode once', () => {
      function C() {
        return <div>Hello</div>;
      }

      const element = <C />;
      const initialType = element.type as any;

      patchShallowRoot(element);

      const newType1 = element.type as any;
      assert.notEqual(newType1, initialType);

      patchShallowRoot(element);

      const newType2 = element.type as any;
      assert.equal(newType2, newType1);
    });

    it('patches class component to call original render and wraps output in a Fragment', () => {
      class C extends PreactComponent<{ msg: string }> {
        render() {
          return <Fragment>{this.props.msg}</Fragment>;
        }
      }

      const element = <C msg="Hello" />;
      patchShallowRoot(element);

      const newType = element.type as any;
      const instance = new newType(element.props);
      const output = instance.render(element.props);

      assert.equal(output.type, Fragment); // Extra fragment
      assert.equal(output.props.children.type, Fragment);
      assert.equal(output.props.children.props.children, 'Hello');
    });

    it('patches function component to call original render and wraps output in a Fragment', () => {
      const fakeThisContext = {};
      function C(this: any, { msg }: { msg: string }) {
        assert.equal(this, fakeThisContext);
        return <Fragment>{msg}</Fragment>;
      }

      const element = <C msg="Hello" />;
      patchShallowRoot(element);

      const newType = element.type as any;
      const output = newType.call(fakeThisContext, { msg: 'Hello' });

      assert.equal(output.type, Fragment); // Extra fragment
      assert.equal(output.props.children.type, Fragment);
      assert.equal(output.props.children.props.children, 'Hello');
    });
  });
});
