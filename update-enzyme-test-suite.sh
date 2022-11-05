#!/bin/bash

PREACT_ADAPTER="$HOME/github/preactjs/enzyme-adapter-preact-pure/build-cjs/test"
TEST_SUITE="$HOME/github/enzymejs/enzyme/packages/enzyme-test-suite"

cd "$TEST_SUITE"
npm run build
npm pack
mv enzyme-test-suite-*.tgz enzyme-test-suite.tgz
cp enzyme-test-suite.tgz "$PREACT_ADAPTER"

cd "$PREACT_ADAPTER"
rm -r enzyme-test-suite

tar -xf enzyme-test-suite.tgz
mv package enzyme-test-suite

find enzyme-test-suite -name \*.js.map -delete

find enzyme-test-suite -type f -path \*.js | xargs sed -i '' 's/require("react")/require("preact\/compat")/'
find enzyme-test-suite -type f -path \*.js | xargs sed -i '' 's/require("react-is")/require("preact\/compat")/'
find enzyme-test-suite -type f -path \*.js | xargs sed -i '' "s/require('react')/require('preact\/compat')/"
find enzyme-test-suite -type f -path \*.js | xargs sed -i '' "s/require('react-dom\/test-utils')/require('preact\/test-utils')/"
find enzyme-test-suite -type f -path \*.js | xargs sed -i '' "s/require('react-dom/require('preact\/compat/"
find enzyme-test-suite -type f -path \*.js | xargs sed -i '' "s/require('react-is')/require('preact\/compat')/"
find enzyme-test-suite -type f -path \*.js | xargs sed -i '' "s/require('create-react-class')/require('@preact\/legacy-compat').createClass/"
find enzyme-test-suite -type f -path \*.js | xargs sed -i '' "s/satisfies(VERSION/satisfies('16.14.0'/"

rm enzyme-test-suite/build/_helpers/react-compat.js*
cp ../../test/preact-compat.js enzyme-test-suite/build/_helpers/react-compat.js
