# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.2.4] - 2021-01-09

- Fix error when setting certain event properties when calling
  `simulate()` in an environment that uses JSDOM [#125](https://github.com/preactjs/enzyme-adapter-preact-pure/pull/125)

## [2.2.3] - 2020-08-11

- Fix a regression in 2.2.1 when a component that is stubbed out during shallow
  rendering is passed a number as a child [#120](https://github.com/preactjs/enzyme-adapter-preact-pure/pull/120)

## [2.2.2] - 2020-08-08

- Fix a regression in 2.2.1 when a component that is stubbed out during shallow
  rendering is passed multiple children [#119](https://github.com/preactjs/enzyme-adapter-preact-pure/pull/119)

## [2.2.1] - 2020-07-19

- Fix exception when shallow rendering a component that uses the "render prop"
  pattern [#107](https://github.com/preactjs/enzyme-adapter-preact-pure/pull/107).

## [2.2.0] - 2019-11-10

- Improve support for projects written in TypeScript by integrating with
  the `@types/enzyme` package [#84](https://github.com/preactjs/enzyme-adapter-preact-pure/pull/84).
  See the [Usage with TypeScript](https://github.com/preactjs/enzyme-adapter-preact-pure#usage-with-typescript) section in the README and example project in `examples/typescript`.

## [2.1.0] - 2019-10-03

- Fix `simulateError` under Preact 10.0.0 [#75](https://github.com/preactjs/enzyme-adapter-preact-pure/pull/75)
- Make Preact v10 the default version internally. Preact v8 support will eventually
  be removed in a future major release. [#76](https://github.com/preactjs/enzyme-adapter-preact-pure/pull/76)

## [2.0.2] - 2019-08-08

- Remove a workaround for old beta releases of Preact 10 which could cause an
  error about mutating a read-only property in certain environments
  [#69](https://github.com/preactjs/enzyme-adapter-preact-pure/pull/69)

## [2.0.1] - 2019-07-18

- Fix an incompatibility with preact-compat for Preact v8
  [#62](https://github.com/preactjs/enzyme-adapter-preact-pure/pull/62)

## [2.0.0] - 2019-06-17

- The adapter no longer patches `setState` to make it synchronous
  [#57](https://github.com/preactjs/enzyme-adapter-preact-pure/pull/57).

**Breaking Changes**

Calls to `setState` on components rendered by Enzyme are no longer synchronous
but are batched as Preact normally does outside of tests. Pending updates are
automatically flushed when an Enzyme wrapper is updated, either as a result
of an Enzyme API call (eg. `wrapper.simulate`, `wrapper.setProps`) or when
[`wrapper.update()`](https://airbnb.io/enzyme/docs/api/ReactWrapper/update.html) is called.

Most tests should be unaffected as they will trigger updates either through
Enzyme API methods or will have needed to call `wrapper.update()` anyway.
Tests can no longer depend on the tree being updated immediately
after `wrapper.setState` returns however. Instead they should wait for the
optional callback to `setState` to be invoked.

## [1.13.4] - 2019-06-10

- Prepare for upcoming internal changes to fragments and components in the
  next Preact 10 release (#55)

## [1.13.3] - 2019-06-04

- Fix shallow-rendering compatibility with Enzyme v3.10 (#51)

## [1.13.2] - 2019-06-01

- Support Preact 10.0.0-beta.2 (#49)

## [1.13.1] - 2019-04-24

- Fix exception with native (non-transpiled) arrow function components (#37)

## [1.13.0] - 2019-04-17

- Synchronously execute effects or state updates created with hooks after
  dispatching simulated events (#36)

## [1.12.0] - 2019-04-14

- Synchronously execute effects created with `useEffect` or `useLayoutEffect`
  hooks after the initial render (#34)

## [1.11.0] - 2019-04-14

- Support `attachTo` option for `mount` rendering to render into an existing
  DOM element

## [1.10.4] - 2019-04-09

- Avoid accessing `children` property of vnodes in Preact 10, as this triggers
  an error when using preact/debug

## [1.10.3] - 2019-04-05

- Work around issue where component type names are shown incorrectly when
  using preact-compat (for Preact v8) and document a limitation which
  is resolved in Preact 10 (#27).

## [1.10.2] - 2019-03-29

- Fix exception when `wrapper.text()` is called on an Enzyme wrapper around a
  text node (#15).

## [1.10.1] - 2019-03-22

- Made the Preact 10 adapter compatible with preact/compat by removing an
  `instanceof Component` check, which breaks if the `Component` class comes
  from the 'preact/compat' bundle
- Made the adapter the default export of the package. The previous named exports
  have been kept for backwards compatibility

## [1.9.0] - 2019-03-15

- Changed the name of the package's main export to `Adapter`. The export is
  also exported under its previous name (`PreactAdapter`) for backwards
  compatibility

## [1.8.0] - 2019-03-12

### Changed

- Internal cleanups to make the adapter less reliant on Preact internals and
  better separate Preact version-specific code

## [1.7.1] - 2019-03-05

### Fixed

- Fix repository link in package.json

- Mark Preact 10 as a dev dependency rather than a runtime dependency and fix
  the version number

## [1.7.0] - 2019-03-05

### Changed

- Support using with production builds of the current version of Preact 10
  (10.0.0-alpha0).

## [1.6.0] - 2019-02-22

### Added

- Support Enzyme wrapper methods which take an element tree as an argument,
  such as `wrapper.contains(...)`.

## [1.5.0] - 2019-02-21

### Added

- Add support for simulating errors.

### Changed

- Children passed to non-rendered components during shallow-rendering are now
  present in the output, for consistency with how shallow rendering works in
  React.

### Fixed

- Shallow rendering now only renders the root element passed to `shallow`,
  not any child component elements passed in the call to `shallow`.

  In other words `shallow(<Parent><Child/></Parent>)` will render `<Parent>`
  but only a stub for `<Child>`.

## [1.4.0] - 2019-02-19

### Added

- Add support for fragments. Children of fragments are presented to Enzyme as
  if they were children of their nearest non-fragment ancestor. In other words,
  fragments do not appear in the component tree exposed to Enzyme in the same
  way that they do not appear in the DOM tree in the browser.

## [1.3.0] - 2019-02-18

### Added

- Initial support for Preact 10 and later. Preact 10 has an entirely different
  rendering implementation and a different VNode shape. The adapter will detect
  at runtime which version of Preact is in use and use an appropriate method to
  convert the render tree into the format that Enzyme expects.

- Support running tests against a custom build of Preact using
  `yarn test --preact-lib <path>`.

### Fixed

- Keys and refs of components and DOM nodes are now exposed to Enzyme.

## [1.2.0] - 2019-02-15

### Changed

- Calls to `setState` on fully-rendered components now trigger synchronous
  updates, for consistency with shallow rendering.

### Fixed

- Components that render only strings are now handled correctly.

- Work around a bug in Enzyme that caused `wrapper.get()` to fail when using
  full rendering.

## [1.1.0] - 2019-02-14

- Map `class` prop to `className` so that Enzyme class selectors work.

## [1.0.0] - 2019-02-14

- Initial release.
