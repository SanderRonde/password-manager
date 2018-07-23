@echo off
SET script_dir=%~dp0

cd %script_dir%/../
call yarn install

cd %script_dir%/../shared/
call yarn install

cd %script_dir%/../server/
call yarn install