@echo off
set known_list=" request valid-url jsdom node-fetch digest-fetch"
set skip_list=" moment node_helper moment logger os path child_process fs"
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
cd "%~dp0"
goto :continue
:check_update_dependencies
setlocal EnableExtensions

rem     # we are in the module folder
rem 
rem     # if the node_helper exists
	if exist "%mod%" (	
		for /F "tokens=2 delims=()" %%i in ('findstr "require(" %mod%') do ( 
		    @set "rn=%%~nxi"
			@rem echo rn=!rn!
			@rem echo first !skip_list!
			@rem check for require of MM supplied functions, doesn't need package.json dependency entry
			@echo > .failed.tmp
			@Echo !skip_list!| findstr /C:"!rn!" >nul && @del .failed.tmp
			@echo off
			@if exist .failed.tmp @(			
				@del .failed.tmp
				@rem echo !rn! not found in list
					@rem Echo.%%i
					@set xxx=!rn!
					@if not exist !keyfile! (
					   @echo creating !keyfile!
					   @npm init -y 2>&1 >>!logfile! 
					   @ echo . >nul
					   @set rn=!xxx!
					   @echo !keyfile! created
					)
					@if !xxx! == "node-fetch" (
						@set xxx="!rn!@2"
					)
					@echo adding !xxx! to module 
					@echo npm install !JustProd! !xxx! 2>&1 >>!logfile!
					@if !xxx! == "" echo library name missing
					@npm install !JustProd! !xxx! 2>&1 
					@rem !logfile!
					@rem echo installing done
			) else (
			   @rem echo !rn! found in !skip_list!
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
			move %logfile% %module_name% >nul
		)
		cd %module_name%
		if exist %mod% (
			call :check_update_dependencies			
			if exist %keyfile% (
			    for /F "usebackq" %%i IN (`findstr "dependencies" !keyfile! ^| find /c /v ""`) do @set results=%%i
				if !results! equ 1 (
					npm install %JustProd% 2>&1 >>%logfile%
				)
			)
		)		
	popd
