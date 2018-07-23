#!/bin/bash

script_path=$( cd "$(dirname "${BASH_SOURCE[0]}")" ; pwd -P )

git clone https://github.com/mongodb/mongo-tools $script_path/../temp/mongo-tools/