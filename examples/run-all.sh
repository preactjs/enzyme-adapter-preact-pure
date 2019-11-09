#!/bin/sh

set -eu

base_dir=$(realpath $(dirname $0))
package_dir="$base_dir/.."
yalc_bin="$package_dir/node_modules/.bin/yalc"

# Build and "publish" the package locally.
(cd $package_dir && $yalc_bin publish)

# Run all the example projects.
for file in $(ls $base_dir)
do
  if [ -d "$base_dir/$file" ]
  then
    echo "Running example \"$base_dir/$file\""

    $base_dir/run-one.sh $base_dir/$file
  fi
done
