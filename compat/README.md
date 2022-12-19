# enzyme-adapter-preact-pure/compat

This sub-package contains the code for providing better compatibility with
React's Enzyme adapter. Using the renderers contained in this sub-package would
be useful for teams migrating a large Enzyme test suite from React to Preact.

It includes some code copied from other code bases to better match Preact and
React's behavior. Those specifics are called out below.

## src/compat-shallow-renderer

The modules in the `src/compat-shallow-renderer` directory implement a custom
render algorithm for Preact components that shallowly renders them. Much of the
core implementation (`diffComponent` and related helpers) is copied directly
from the Preact 10 source code.

### Usage

This alternate shallow renderer exists primarily for compatibility with the
React shallow renderer. It assists with migrating existing test suites written
against the React Enzyme adapter, and not something that would be recommended
for pure-Preact projects. For pure-Preact projects, we recommend using full
mount rendering over shallow rendering. If mocking children components is
important to your testing strategy, consider the approach outlined in
https://robertknight.me.uk/posts/shallow-rendering-revisited/.

### react-shallow-renderer

The custom shallow render algorithm is exposed on a class that mirrors Enzyme's
`ReactShallowRender`. This class, `PreactShallowRenderer`, exposes the same API as
`ReactShallowRenderer` and passes nearly the exact same test suite.

### Preact source

Parts of the core diffing algorithm are copied directly from Preact's source.
Those functions are in `preact10-shallow-diff.ts`. Since this file includes code
from Preact's source, we need to transform the friendly names of internal
properties to their mangled public names. We run a custom Babel transform on
this file to do that replacement.

Since portions of this code are copied from other codebases, some of the code may
deviate from the conventions of other parts of the project in order to keep it
aligned with the original source. However, all code is still formatted per
Prettier and TypeScript types are added for type safety.

## test/compat-shallow-renderer

Most/many of tests in the `test/compat-shallow-renderer` directory are taken
from Enzyme's `react-shallow-renderer`. Test files that are taken from that repo
include a comment at the top of the file indicating such. These test files have
been modified to be TypeScript, formatted to this repo's formatting standards,
and updated to match which features Preact updates (i.e. tests asserting
features Preact doesn't support are skipped).
