@echo off

echo copying git pre-commit hook

copy .pre-commit .git\hooks

touch module_installer\local.css