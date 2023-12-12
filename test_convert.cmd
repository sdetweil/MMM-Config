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
cd %d%
@rem get the current module and config file last changed dates
@for /f "tokens=1,2"  %%m in ('dir ..\..\ ^| find "modules" ^| find /v "node"') do (set modules_lastchanged="%%m %%n")
@for /f "tokens=1,2"  %%m in ('dir ..\..\config\config.js ^| find "config.js"') do (set config_lastchanged="%%m %%n")

set defaults_file=%d%\defaults.js
set schema_file_exists=0
set FILE=%d%/schema3.json
if exist %FILE% (
	if "%1." neq "override." (
    	set schema_file_exists=1
    )
)
set changed=0
set need_to_update_modules=0
rem windows bacth has no OR operator
if %modules_lastsaved% neq %modules_lastchanged% ( set set need_to_update_modules=1)
if %schema_file_exists% equ 0 (set need_to_update_modules=1)
if %need_to_update_modules% equ 1 (
rem
rem if modules folder change date doesn't match saved
rem

       del somefile 2>nul
	   rem get all the modules installed
       for /f "tokens=1 delims=\ usebackq" %%i in (`dir  .. /b/ad ^| find /v "default"`) do @echo %%i >>somefile
	   rem get all the default modules
	   for /f "tokens=1 delims=\ usebackq" %%i in (`dir  ..\default /b/ad  ^| find /V ".git" ^| find /V "node_modules"`) do @echo default\%%i >>somefile
	   rem make a sorted unique list
          type somefile | powershell -nop "$input | sort -unique >somefile2.txt"
	   rem delete the work file
	   del somefile 2>/nul
	   rem delete the output to start fresh
	   del defines.js 2>/nul
	   rem add teh js header needed
	   echo var config = require^('../../config/config.js'^) >%defaults_file%
	   echo var defined_config = {  >>%defaults_file%
	   rem loop thru all the files and process the defines for each
          for /f "tokens=1 usebackq delims=~" %%A in (`type somefile2.txt`) do  call :process_define "%%A"  %defaults_file%
	   rem delete the work file
	   rem del somefile2.txt 2>/nul
	   rem add the js trailer
	   echo } >>%defaults_file%
	   echo module.exports={defined_config,config};  >>%defaults_file%
	   rem record that we processed for the modules now
	   for /f "tokens=1,2 usebackq"  %%m in (`dir ..\..\ ^| find "modules" ^| find /v "node"`) do echo "%%m %%n" >%d%modules_lastchanged
	   set changed=1
)
rem check the generated defaults.js for errors
node scripts\test.js %defaults_file% 2>sss >nul
rem
# if the file exists and the line count is greater than 0
if exist sss (
	set lc=0
	FOR /F "tokens=* USEBACKQ" %%F IN (`type sss ^| find /c /v ""`) DO (
		SET lc=%%F
	)
	rem echo !lc!
  	 if !lc! NEQ 0 (
	   rem echo have error file
	   rem ln=$(cat sss | awk -F: '{print $2}' | grep -m1 .)
	   for /f "tokens=1 delims=\ usebackq" %%i in (`type sss  ^| find "/modules/MMM-Config/defaults" ^| head -n 1`) do set firstline=%%i
	   rem echo line=%firstline%
	   for /f "tokens=2 delims=:" %%a in ("%firstline%") do (
	    set ln=%%a
	   )
	   rem echo line number = !ln!
	   rem get the module name from the defaults file
	   rem mname=$(grep -n -v "^\s" defaults.js | awk 'NR>2' |  awk -F: '$1<'$ln | awk -F: '{print $2}' | awk -F_ '{print $1"-"$2}')
	   findstr /r /n /c:"_defaults:" defaults.js >sss1
	   for /f "tokens=1,2 delims=:" %%a in (sss1) do (
	     set ml=%%a
		set mname=%%b
		if !ml! LEQ !ln! (
			for /f "tokens=1,2 delims=_"  %%a in ("!mname!") do (
			   set mname1=%%a-%%b
			   rem echo module name =!mname1!

			   del sss1
			   FOR /f "tokens=1* delims=:" %%a IN ('findstr /n "^" "sss"') DO (
				IF %%a==2 (
				FOR /L %%G IN (1,1,20) DO  echo | set /p=-
				echo MMM-Config
				echo module !mname1! has an error in the construction of its defaults section
				echo the error line is %%b
				echo please change it to the literal value of the referenced defaults variable
				echo and restart MagicMirror
				FOR /L %%G IN (1,1,20) DO  echo | set /p=-
				echo MMM-Config
				)
			   )
			)
		)
	   )
	)
	del sss
)
rem proces for the web page in either modules list or config.js changed
if %config_lastsaved% neq %config_lastchanged%  (set changed=1)
if %modules_lastsaved% neq %modules_lastchanged%  (set changed=1)
if %modules_lastsaved% neq %modules_lastchanged%  (set changed=1)
	if %changed% equ 1 (
	   node scripts\buildschema4.js %defaults_file% >%FILE%
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
		set "m=!m:~1!"            remove the 1st character
        	set "m=!m:~0,-1!
		rem echo !m!
		if "%m:~0,7%"=="default"  (
			set mf=%m:~0,-1%
			set m=%m:~8,-1%
			rem echo !m!  ended
		) else (
			set mf=%m:~0,-1%
			set m=%m:~0,-1%
		)
		for /f "usebackq tokens=1 delims=~" %%B in ('!m!') do (
			set m=%%B
			rem echo."%m%"
		)
		IF EXIST "..\%mf%\%m%.js" (
			node %d%\scripts\dumpdefaults.js "..\%mf%\%m%.js" >>%2
		)
  goto :eof
:done
