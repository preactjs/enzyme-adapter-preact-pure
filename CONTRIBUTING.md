# Contributing

This document is intended for developers interested in making contributions to
the adapter and to document processes like releasing a new version.

## Getting Started

1. Install [Yarn](https://yarnpkg.com)
2. Clone the repository and run `yarn install` to install dependencies
3. Run `yarn build` to compile the code and output the result into the `build`
   directory
4. Run `yarn test` to run tests against the stable version of Preact. There are
   also variations on this command to run tests against different versions of
   Preact. See the `scripts` section of `package.json` for the current list.
5. Run `yarn format` to reformat your code

If you want to test your local version of the adapter with another project
that you are working on, the [yalc](https://github.com/whitecolor/yalc) tool
is a convenient way to do this.

## Creating Pull Requests

When creating pull requests for this project please remember to:

1. Include regression tests that cover any changes you have made and make
   sure they pass against the supported versions of Preact (see the `scripts`
   section of `package.json` for available commands that run tests against
   different versions of Preact)
2. Format code using `yarn format` before committing
3. Write helpful Git commit messages and pull request descriptions for the benefit of
   other users and future contributors

## Compatibility

There are developers maintaining large test suites that rely on Preact, Enzyme
and this adapter. Please be considerate when making changes that may require
these developers to make changes in their test suites.

## Releasing the Preact Enzyme adapter

This guide is intended for core team members that have the necessary rights
to publish new releases on npm.

1. Install the [np](https://github.com/sindresorhus/np) tool which automates
   several of the steps involved in a new release
1. Update the CHANGELOG.md file on the master branch and push it to GitHub.
   See the notes at the top for details on the format.
1. Run `np patch`, `np minor` or `np major` depending on the type of
   release according to [semantic versioning](https://semver.org) principles
1. The previous step should open a new form in your browser to fill in the
   GitHub release notes. This will generally consist of a short summary of what
   changed in this release along with the relevant entries from the CHANGELOG.md
   file
