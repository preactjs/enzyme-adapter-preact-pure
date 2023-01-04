# enzyme-adapter-preact-pure

This is an adapter to support using the [Enzyme](https://enzymejs.github.io/enzyme/) UI
component testing library with [Preact](https://preactjs.com). For documentation, please see [the testing guide on the PreactJS website](https://preactjs.com/guide/v10/unit-testing-with-enzyme).

## Supported Preact versions

Version 3.x of the adapter supports Preact v10+. Earlier versions support both
Preact v8 and v10.

## Usage

Add the library to your development dependencies:

```sh
# If using npm
npm install --save-dev enzyme-adapter-preact-pure

# If using yarn
yarn add --dev enzyme-adapter-preact-pure
```

Then in the setup code for your tests, configure Enzyme to use the adapter
provided by this package:

```js
import { configure } from 'enzyme';
import Adapter from 'enzyme-adapter-preact-pure';

configure({ adapter: new Adapter() });
```

Once the adapter is configured, you can write Enzyme tests for your Preact
UI components following the [Enzyme docs](https://enzymejs.github.io/enzyme/).
The full DOM rendering, shallow rendering and string rendering modes are
supported.

## Example projects

For runnable example projects, see the [examples/](examples/) directory. To run the
examples locally, clone this repository, then run:

```sh
cd examples/<project name>
npm install
npm test
```

## Differences compared to Enzyme + React

The general intent is that tests written using Enzyme + React can be easily made
to work with Enzyme + Preact or vice-versa. However there are some differences
in behavior between this adapter and Enzyme's React adapters to be aware of:

### Shallow rendering

- When using Enzyme's shallow rendering mode, this adapter _always_ invokes the
  component's lifecycle methods (`componentDidUpdate` etc.).
  The `disableLifecycleMethods` option is not respected.

- React's shallow rendering does not create actual DOM nodes. The shallow
  rendering implemented by this adapter does. It works by simply by rendering
  the component as normal, except making any child components output only the
  children passed to them. In other words, during shallow rendering, all child
  components behave as if they were defined like this:

  ```js
  function ShallowRenderedChild({ children }) {
    return children;
  }
  ```

  This means that any side effects that rendered DOM elements have, such as `<img>`
  elements loading images, will still execute.

If you are converting a React Enzyme test suite to use Preact, try out our `CompatShallowRenderer`. This renderer is an alternate shallow renderer to the default that uses a custom diffing algorithm that mirrors the Preact diff algorithm but only shallowly renders elements, similarly to what [`react-shallow-render`](https://github.com/enzymejs/react-shallow-renderer) does for React components. This renderer has a couple of behaviors that more closely resembles the React adapters, including:

- No DOM nodes are created, so a DOM environment is not required
- `disableLifecycleMethods` option is respected
- Virtual element props are preserved intact so filter methods on the Enzyme wrapper behave more similarly to the React wrappers

To enable the `CompatShallowRenderer`, pass it into the `shallowRenderer` Adapter option when configuring Enzyme:

```js
import { configure } from 'enzyme';
import Adapter from 'enzyme-adapter-preact-pure';
import { CompatShallowRenderer } from 'enzyme-adapter-preact-pure/compat';

// Setup Enzyme
configure({
  adapter: new Adapter({
    ShallowRenderer: CompatShallowRenderer,
  }),
});
```

### Simulating events

The [simulate](https://enzymejs.github.io/enzyme/docs/api/ReactWrapper/simulate.html)
API does not dispatch actual DOM events in the React adapters, it just calls
the corresponding handler. The Preact adapter does dispatch an actual event
using `element.dispatchEvent(...)`. Because this behavior, the Preact adapters can only simulate events on real DOM nodes, not Components.

If you'd like to simulate events on Components, enable the `simulateEventsOnComponents` option in the Adapter options. This option changes the previous behavior of how events were dispatched (by directly invoking event handlers instead of dispatching an event) and so is disabled by default. Enabling this option is useful if you are migrating an Enzyme test suite from React to Preact.

```js
import { configure } from 'enzyme';
import Adapter from 'enzyme-adapter-preact-pure';

// Setup Enzyme
configure({
  adapter: new Adapter({
    simulateEventsOnComponents: true,
  }),
});
```

### String rendering

By default, the Preact string renderer renders your component into the DOM and then returns the `innerHTML` of the DOM container. This behavior means string rendering requires a DOM environment.

If you'd like to run tests that use the string renderer in a test environment that does not have a DOM, pass `preact-render-to-string` into the `renderToString` Adapter option. Enabling this option is useful if you are migrating an Enzyme test suite from React to Preact.

```js
import { configure } from 'enzyme';
import Adapter from 'enzyme-adapter-preact-pure';
import renderToString from 'preact-render-to-string';

// Setup Enzyme
configure({
  adapter: new Adapter({
    renderToString,
  }),
});
```

### State updates

`setState` synchronously re-renders the component in React, [except in event
handlers](https://reactjs.org/docs/faq-state.html#when-is-setstate-asynchronous).
Preact on the other hand by default batches together calls to `setState` within
the same tick of the event loop and schedules a render to happen in a future
microtask. React's behavior [may change in a future release](https://stackoverflow.com/a/48610973/434243).

To make writing tests easier, the Preact adapter will apply any pending state
updates and re-render when:

- The component is initially rendered by `mount` or `shallow`
- An Enzyme API call is made that is expected to trigger a change in the
  rendered output, such as `wrapper.setProps`, `wrapper.simulate` or
  `wrapper.setState`
- `wrapper.update` is called explicitly by a test

The consequences of this when writing tests are that any state updates triggered
outside of an Enzyme method call will not be reflected in the rendered DOM until
`wrapper.update` is called. Note this function also needs to be called when using
React, as it synchronizes Enzyme's snapshot of the output with the actual DOM
tree.

**Example:**

```js
const wrapper = shallow(<ParentComponent />);

// Trigger a state update outsize of Enzyme.
wrapper.find(ChildComponent).props().onClick();

// Update the Enzyme wrapper's snapshot.
wrapper.update();

// Test that parent component updated as expected.
```

When using the [Hooks](https://reactjs.org/docs/hooks-intro.html) API you also
need to wrap any code which triggers effects in an
[act](https://reactjs.org/docs/test-utils.html#act) call in order to flush
effects and trigger a re-render. The initial render and calls to APIs such as
`setProps` or `simulate` are automatically wrapped in `act` for you.

In Preact the `act` function is available in the "preact/test-utils" package.

```js
import { act } from 'preact/test-utils';

// Any effects scheduled by the initial render will run before `mount` returns.
const wrapper = mount(<Widget showInputField={false} />);

// Perform an action outside of Enzyme which triggers effects in the parent
// `Widget`. Since Enzyme doesn't know about this, we have to wrap the calls
// with `act` to make effects execute before we call `wrapper.update`.
act(() => {
  wrapper.find(ChildWidget).props().onButtonClicked();
});

// Update the Enzyme wrapper's snapshot
wrapper.update();
```

### Property names

In order to support Enzyme's class selectors, `class` props on Preact components
are mapped to `className`.

```js
import { mount } from 'enzyme';

const wrapper = mount(<div class="widget" />);
wrapper.props(); // Returns `{ children: [], className: 'widget' }`
wrapper.find('.widget').length; // Returns `1`
```

### Usage with preact/compat

This package has the same interface as the official
enzyme-adapter-react-$version packages. If you are using preact/compat, you can
alias enzyme-adapter-react-$version to this package in the same way as
[preact/compat](https://preactjs.com/guide/switching-to-preact).

### Usage with TypeScript

This package is compatible with TypeScript and ships with type declarations.
In order to mix Enzymes types from `@types/enzyme` with Preact, you will need
to include some extensions to the "preact" types which are provided by this
project.

To do that, add the following line to one of the source files or `.d.ts` files
for your project:

```ts
/// <reference types="enzyme-adapter-preact-pure" />
```

See the TypeScript example in `examples/typescript` for a runnable example.

## Development

After cloning the repository, you can build it and run tests as follows:

```sh
# Install dependencies.
yarn install

# Build the adapter library.
yarn build

# Run tests.
yarn test

# Run tests against a custom build of Preact.
yarn test --preact-lib <path to Preact bundle>
```

### Release process

New releases of this package are created using [np](https://github.com/sindresorhus/np).

1. Check out the latest `master` branch
2. Edit CHANGELOG.md to add notes for the version you are about to release.
3. Commit the changes to CHANGELOG.md and push back to GitHub
4. Run `np <semver-type>` to create the release, where `<semver-type>` is the
   category of release according to Semantic Versioning, typically `minor`.

## FAQ

**Can I use this library to test components that use hooks?**

Yes. This library supports components that use the "Hooks" APIs available in
Preact v10+. You may need to use the `act` function from `preact/test-utils`
to flush effects synchronously in certain places. See the notes above about
state updates in tests.

**Why does the package name have a "-pure" suffix?**

The name has a "-pure" suffix to distinguish it from
[enzyme-adapter-preact](https://github.com/aweary/enzyme-adapter-preact)
package which indirectly depends on React. This library is a "pure" Preact
adapter which does not require Preact's React compatibility add-on.
