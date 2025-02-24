@echo off

echo copying git pre-commit hook

copy .pre-commit .git\hooks

call touch module_installer\local.css
call touch local.css
del config.html 2>nul
copy templates\module_url_hash.json >nul