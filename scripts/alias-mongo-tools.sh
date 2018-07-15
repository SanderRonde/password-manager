#!/bin/bash

script_path=$( cd "$(dirname "${BASH_SOURCE[0]}")" ; pwd -P )

shopt -s expand_aliases
echo "alias mongodump=\"go run ${script_path}/../temp/mongo-tools/mongodump/main/mongodump.go\"" >> ~/.bashrc
echo "alias mongorestore=\"go run ${script_path}/../temp/mongo-tools/mongorestore/main/mongorestore.go\"" >> ~/.bashrc
source ~/.bashrc