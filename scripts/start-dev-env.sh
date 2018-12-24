#!/bin/bash

current_dir=`echo $PWD`
script_path=$( cd "$(dirname "${BASH_SOURCE[0]}")" ; pwd -P )

TERM=$TERMINAL
if [ -z $TERM ]; then
	TERM="terminal"
fi

cd $script_path/../
$TERM -e "bash -c \"tsc -p server/tsconfig.json -w\""
$TERM -e "bash -c \"tsc -p shared/tsconfig.json -w\""
$TERM -e "bash -c \"tsc -p server/app/actions/server/webserver/client/tsconfig.json -w\""
$TERM -e "bash -c \"gulp env:dev watch\""
if [ "$1" == "-d" ]; then
	echo "doing"
	mkdir "$script_path/../database/" || echo "dir already exists"
	$TERM -e "bash -c \"mongod --dbpath=$script_path/../database/\""
fi
nodemon