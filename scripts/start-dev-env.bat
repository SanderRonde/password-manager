@echo off
SET script_dir=%~dp0

cd %script_dir%/../
start cmd /k tsc -p server/tsconfig.json -w
start cmd /k tsc -p shared/tsconfig.json -w
start cmd /k tsc -p server/app/actions/server/webserver/client/tsconfig.json -w
start cmd /k gulp watch
If ("%1" == "-d") (
	mkdir "%script_dir%..\database\"
	start cmd /k mongod --dbpath=%script_dir%..\database\
)
nodemon