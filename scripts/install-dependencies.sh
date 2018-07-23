#!/bin/bash

current_dir=`echo $PWD`
script_path=$( cd "$(dirname "${BASH_SOURCE[0]}")" ; pwd -P )

cd $script_path/../
yarn install

cd $script_path/../server
yarn install

cd $script_path/../shared
yarn install

cd current_dir