@echo off
set known_list="request valid-url jsdom node-fetch digest-fetch"
set modules_path=..\..\..\modules
set module_name=%1
set module_url=%2
set keyfile=package.json
set logfile=install.log
set JustProd="--no-audit --no-fund --no-update-notifier --no-warn"
set npm_config_loglevel=silent
set mod=node_helper.js
setlocal EnableExtensions
Setlocal EnableDelayedExpansion
goto :continue
:check_update_dependencies
setlocal EnableExtensions

rem     # we are in the module folder
rem 
rem     # if the node_helper exists
	if exist "%mod%" (	
		for /F "tokens=2 delims=()" %%i in ('findstr "require(" %mod%') do ( set "rn=%%~nxi"
			@rem echo rn=!rn!
			Echo.!known_list!| findstr /C:"!rn!">nul && (
				@rem Echo.Substring !rn! found!
				@rem Echo.%%i
				if not exist !keyfile! (
				   npm init -y
				)
				if !rn! == "node-fetch" (
					set rn="!rn!@2"
				)
				npm install !JustProd! !rn! >>!logfile! 2>&1	
			)
		)
	)
	exit /b 0
:continue	
	pushd
	cd %modules_path%
		echo "received request to install module " %module_name% from %module_url%
		if not exist %module_name% (
			git clone %module_url% >%logfile% 2>&1
			move %logfile% %module_name%
		)
		cd %module_name%
		if exist %mod% (
			call :check_update_dependencies			
			if exist %keyfile% (
			    for /F "usebackq" %%i IN (`findstr "dependencies" !keyfile! ^| find /c /v ""`) do set results=%%i
				if !results! equ 1 (
					npm install %JustProd% 2>&1 >>%logfile%
				)
			)
		)		
	popd
