#!/bin/bash

current_dir=`echo $PWD`
script_path=$( cd "$(dirname "${BASH_SOURCE[0]}")" ; pwd -P )

cd $script_path/../
terminal -e tsc -p server/tsconfig.json -w
terminal -e tsc -p shared/tsconfig.json -w
terminal -e tsc -p test/tsconfig.json -w
terminal -e tsc -p server/app/actions/server/webserver/client/src/tsconfig.json -w
mkdir "$script_path/../database/"
terminal -e mongod --dbpath=$script_path/../database/
nodemon