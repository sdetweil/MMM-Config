@echo off 
Setlocal EnableDelayedExpansion 
rem
rem port of unix script
rem

set base=MagicMirror
set d=%~dp0

rem make sure the lastchanged files exist
call %d%touch %d%modules_lastchanged >nul
call %d%touch %d%config_lastchanged >nul

rem set the last changed to null in case the files are empty
set modules_lastsaved=""
set config_lastsaved=""

rem get the contents of the last changed files 
for /f "delims=" %%x in (%d%modules_lastchanged) do (set modules_lastsaved=%%x)
for /f "delims=" %%x in (%d%config_lastchanged) do (set config_lastsaved=%%x)

@rem get the current module and config file last changed dates
@for /f "tokens=1,2"  %%m in ('dir ..\..\ ^| find "modules" ^| find /v "node"') do (set modules_lastchanged="%%m %%n")  
@for /f "tokens=1,2"  %%m in ('dir ..\..\config\config.js ^| find "config.js"') do (set config_lastchanged="%%m %%n")

set defaults_file=%d%\defaults.js

if %modules_lastsaved% neq %modules_lastchanged% (
rem 
rem if modules folder change date doesn't match saved
rem       
       cd %d%
       del somefile 2>nul
       rem figure out which token we need from path
       set t=6
       if "%d:~0,14%"=="C:\MagicMirror" (
		 set t=4 
		)
		echo !t! >nul
	   rem get all the modules installed
       for /f "tokens=%t% delims=\ usebackq" %%i in (`dir  .. /s/b/ad * ^| find /v "default"`) do @echo %%i >>somefile
	   rem get all the default modules
	   for /f "tokens=1 delims=\ usebackq" %%i in (`dir  ..\default /b/ad * ^| find /V ".git" ^| find /V "node_modules"`) do @echo default\%%i >>somefile
	   rem make a sorted unique list
       type somefile | powershell -nop "$input | sort -unique >somefile2.txt
	   rem delete the work file
	   del somefile 2>/nul
	   rem delete the output to start fresh 
	   del defines.js 2>/nul		   
	   rem add teh js header needed
	   echo var config = require^('../../config/config.js'^) >%defaults_file% 
	   echo var defined_config = {  >>%defaults_file%
	   rem loop thru all the files and process the defines for each 
       for /f "tokens=1 usebackq" %%A in (`type somefile2.txt`) do  call :process_define %%A  %defaults_file% 
	   rem delete the work file
	   del somefile2.txt 2>/nul
	   rem add the js trailer
	   echo } >>%defaults_file%
	   echo module.exports={defined_config,config};  >>%defaults_file%
	   rem record that we processed for the modules now
	   for /f "tokens=1,2 usebackq"  %%m in (`dir ..\..\ ^| find "modules" ^| find /v "node"`) do echo "%%m %%n" >%d%modules_lastchanged
)	   
rem proces for the web page in either modules list or config.js changed
set changed=0
if %config_lastsaved% neq %config_lastchanged%  (set changed=1)
if %modules_lastsaved% neq %modules_lastchanged%  (set changed=1)
	if %changed% equ 1 (
	   node buildschema.js %defaults_file% >schema2.js
       for /f "tokens=1,2 usebackq"  %%m in (`dir ..\..\config\config.js ^| find "config.js"` ) do echo "%%m %%n" > %d%config_lastchanged
	)
	   
echo completed
rem  for testing, launch browser to view form
rem  start msedge %d%\testit.html
goto :done
:process_define
Setlocal EnableDelayedExpansion
		set m=%1 		
		rem echo !m!
		if "%m:~0,7%"=="default"  ( 
			set m=%m:~8%
			rem echo !m!  ended
		)
		for /f "usebackq tokens=1 " %%B in ('!m!') do (
			set m=%%B
			rem echo."%m%"
		)		
		node %d%\dumpdefaults.js "..\%1\%m%.js" >>%2
  goto :eof
:done  