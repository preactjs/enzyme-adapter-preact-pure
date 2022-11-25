# src/compat-shallow-renderer

The modules in this directory implement a custom diff algorithm for Preact
components that shallowly renders them. Much of the core implementation
(`diffComponent` and related helpers) is copied directly from the Preact 10
source code.

## Usage

This alternate shallow renderer exists primarily for compatibility with the
React shallow renderer. It assists with migrating existing test suites written
against the React Enzyme adapter, and not something that would be recommended
for pure-Preact projects. For pure-Preact projects, we recommend using full
mount rendering over shallow rendering. If mocking children components is
important to your testing strategy, consider the approach outlined in
https://robertknight.me.uk/posts/shallow-rendering-revisited/.

## react-shallow-renderer

The custom shallow diff algorithm is exposed on a class that mirrors Enzyme's
`ReactShallowRender`. This class, `Preact10ShallowDiff`, exposes the same API as
`ReactShallowRenderer` and passes nearly the exact same test suite.

## Preact source

Parts of the core diffing algorithm are copied directly from Preact's source.
Those functions are in `preact10-src.ts`. Since this file includes code from
Preact's source, we need to transform the friendly names of internal properties
to their mangled public names. We run a custom Babel transform on this file to
do that replacement.

Since portions of this code is copied from other codebases, some of the code may
deviate from the conventions of other parts of the project in order to keep it
aligned with the original source. However, all code is still formatted per
Prettier and TypeScript types are added for type safety.
