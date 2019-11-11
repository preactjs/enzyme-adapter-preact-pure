# enzyme-adapter-preact-pure

[![Build Status](https://travis-ci.org/preactjs/enzyme-adapter-preact-pure.svg?branch=master)](https://travis-ci.org/preactjs/enzyme-adapter-preact-pure) [![Greenkeeper badge](https://badges.greenkeeper.io/preactjs/enzyme-adapter-preact-pure.svg)](https://greenkeeper.io/)

This is an adapter to support using the [Enzyme](https://airbnb.io/enzyme/) UI
component testing library with [Preact](https://preactjs.com). For documentation, please see [the testing guide on the PreactJS website](https://preactjs.com/guide/v10/unit-testing-with-enzyme).

## Supported Preact versions

The adapter supports both Preact 10+ and the latest Preact v8.x release. Using Preact 10+ is recommended.

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

configure({ adapter: new Adapter });
```

Once the adapter is configured, you can write Enzyme tests for your Preact
UI components following the [Enzyme docs](https://airbnb.io/enzyme/).
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

### Simulating events

The [simulate](https://airbnb.io/enzyme/docs/api/ReactWrapper/simulate.html)
API does not dispatch actual DOM events in the React adapters, it just calls
the corresponding handler. The Preact adapter does dispatch an actual event
using `element.dispatchEvent(...)`.

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
const wrapper = shallow(<ParentComponent/>);

// Trigger a state update outsize of Enzyme.
wrapper.find(ChildComponent).props().onClick();

// Update the Enzyme wrapper's snapshot.
wrapper.update();

// Test that parent component updated as expected.
```

When using the [Hooks](https://reactjs.org/docs/hooks-intro.html) API which is
available in React 16.8+ and Preact 10, you also need to wrap any code which
triggers effects in an [act](https://reactjs.org/docs/test-utils.html#act) call
in order to flush effects and trigger a re-render. The initial render and calls
to APIs such as `setProps` or `simulate` are automatically wrapped in `act`
for you.

In Preact the `act` function is available in the "preact/test-utils" package.

```js
import { act } from 'preact/test-utils';

// Any effects scheduled by the initial render will run before `mount` returns.
const wrapper = mount(<Widget showInputField={false}/>);

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

const wrapper = mount(<div class="widget"/>);
wrapper.props() // Returns `{ children: [], className: 'widget' }`
wrapper.find('.widget').length // Returns `1`
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

**preact-compat and functional components**

preact-compat (for Preact v8) wraps functional components with a wrapper.
This means that passing component types to Enzyme methods
(eg. `wrapper.find(MyComponent)`) will not work if the component type is a function.
Passing the _name_ of the function (`wrapper.find('MyComponent')`) will still
work.

This issue does not apply when using Preact 10 (with preact/compat).

## Development

After cloning the repository, you can build it and run tests as follows:

```
# Install dependencies.
yarn install

# Build the adapter library.
yarn build

# Run tests.
yarn test

# Run tests against a custom build of Preact.
yarn test --preact-lib <path to Preact bundle>
```

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
