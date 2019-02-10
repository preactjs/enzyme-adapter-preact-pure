**EARLY STAGE PACKAGE: This package is still young. It is functional and has tests but has not been extensively battle-tested.**

# enzyme-adapter-preact-pure

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
import { PreactAdapter } from 'enzyme-adapter-preact-pure';

configure({ adapter: new PreactAdapter });
```

Once the adapter is configured, you can write Enzyme tests for your Preact
UI components following the [Enzyme docs](https://airbnb.io/enzyme/).


### Important note about shallow rendering

When using Enzyme's shallow rendering mode, this adapter _always_ invokes the
component's lifecycle methods (`componentDidUpdate` etc.). However, this is
handled by the adapter itself rather than by Enzyme. Therefore it is necessary
to **turn off** Enzyme's own lifecycle support:

```js
import { configure, shallow } from 'enzyme';

describe('MyComponent', () => {
  it('renders something', () => {
    const wrapper = shallow(<MyComponent />, {
      // Disable Enzyme's own lifecycle method handling. The adapter does this
      // instead.
      disableLifecycleMethods: true,
    });

    …
  });
});
```

## Notes

This library is written in TypeScript and includes partial typings for the
parts of Enzyme that adapter library authors use. These may be useful if you
want to write an adapter for a different library.
