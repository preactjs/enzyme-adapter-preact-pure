# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

- Fix exception when `wrapper.text()` is called on an Enzyme wrapper around a
  text node.

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
