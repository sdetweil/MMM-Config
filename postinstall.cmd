@echo off

echo copying git pre-commit hook

copy .pre-commit .git\hooks

touch module_installer\local.css
touch local.css
del config.html 2>nul
