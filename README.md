# enzyme-adapter-preact-pure

[![Build Status](https://travis-ci.org/preactjs/enzyme-adapter-preact-pure.svg?branch=master)](https://travis-ci.org/preactjs/enzyme-adapter-preact-pure) [![Greenkeeper badge](https://badges.greenkeeper.io/preactjs/enzyme-adapter-preact-pure.svg)](https://greenkeeper.io/)

This is an adapter to support using the [Enzyme](https://airbnb.io/enzyme/) UI
component testing library with [Preact](https://preactjs.com).

The name has a "-pure" suffix to distinguish it from
[enzyme-adapter-preact](https://github.com/aweary/enzyme-adapter-preact) which
indirectly depends on React. This library is a "pure" Preact adapter which does
not require Preact's React compatibility library (preact-compat). Hopefully
these packages can be unified in future to avoid confusion for developers.

## Usage

Add the library to your development dependencies:

```
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


### Important note about shallow rendering

When using Enzyme's shallow rendering mode, this adapter _always_ invokes the
component's lifecycle methods (`componentDidUpdate` etc.).
The `disableLifecycleMethods` option is not respected.

### Property mapping

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

## Notes

This library is written in TypeScript and includes partial typings for the
parts of Enzyme that adapter library authors use. These may be useful if you
want to write an adapter for a different library.
