#!/bin/sh

base_dir=$(dirname $0)
for file in $(ls $base_dir)
do
  if [ -d "$base_dir/$file" ]
  then
    cd $base_dir/$file && npm install && npm test
  fi
done
