#!/bin/sh

set -eux

package_dir="../../"
yalc_bin="$package_dir/node_modules/.bin/yalc"

cd $1
rm -rf node_modules/
npm ci

# Install the local version of the adapter using yalc, which ensures that it
# behaves the same way as the package installed from npm.
$yalc_bin link enzyme-adapter-preact-pure

npm test

