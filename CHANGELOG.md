# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
