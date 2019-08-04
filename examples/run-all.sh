#!/bin/sh

base_dir=$(dirname $0)
for file in $(ls $base_dir)
do
  if [ -d "$base_dir/$file" ]
  then
    echo "Running example \"$base_dir/$file\""
    (cd "$base_dir/$file" && rm -rf node_modules/ && npm ci && npm test)
  fi
done
