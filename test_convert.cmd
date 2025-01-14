@echo off

setlocal EnableDelayedExpansion

rem
rem port of unix script
rem

set base=MagicMirror
set d=%~dp0

rem set the identifier in case there are multiple instances
set identifier=%MM_identifier%

rem  get the configured modules location or use the default
set modules_location=%MM_MODULES_DIR%
if "!modules_location!"=="" set modules_location=modules
rem echo modules_dir=!modules_location!
rem get the config file name, or use the default
set config_name=%MM_CONFIG_FILE%
if "!config_name!"=="" set config_name=/config/config.js
if "!config_name:~0,1!"=="/"  set config_name=!config_name:~1!
rem echo !config_name!

set config_lastchange_file=config_lastchange_!identifier!
set modules_lastchange_file=modules_lastchange_!identifier!

rem make sure the lastchanged files exist
cmd /c %d%touch %d%%modules_lastchange_file% >nul
cmd /c %d%touch %d%%config_lastchange_file% >nul

rem set the last changed to null in case the files are empty
set modules_lastsaved=""
set config_lastsaved=""

rem get the contents of the last changed files
for /f "delims=" %%x in (%d%%modules_lastchange_file%) do (set modules_lastsaved=%%x)
for /f "delims=" %%x in (%d%%config_lastchange_file%) do (set config_lastsaved=%%x)
cd %d%
@rem get the current module and config file last changed dates
for /f "tokens=1,2 usebackq"  %%m in (`dir ..\..\ ^| find "!modules_location!" ^| find "<DIR>"`) do (set modules_lastchanged="%%m %%n")
rem if linux path separators were used , change to windows style
set temp_config_name=%config_name:/=\%
rem echo temp_config=%temp_config_name%
rem get the name part (has path first) 
for /f "usebackq tokens=2 delims=\" %%m in ('%temp_config_name%') do (set config_filename=%%m)
rem get the date/time that config file changes.. watch out for other files in the config folder
for /f "tokens=1-2,5 usebackq"  %%m in (`dir ..\..\!temp_config_name! ^| find "!config_filename!"`) do (set config_lastchanged="%%m %%n")
rem copy our repo clean copy of the config form html 
rem we may need to add module extsions info to it
if not exist config.html (
	copy templates\config.html >nul
)
del animateCSS.js 2>nul
rem check if the list of animations has an export statement
rem if not its downlevel, so copy and add it
findstr  "export" ..\..\js\animateCSS.js 
if %errorlevel% equ 1 (
	copy ..\..\js\animateCSS.js  >nul
	echo|set /p="if (typeof window === 'undefined') module.exports = { AnimateCSSIn, AnimateCSSOut };" >> animateCSS.js
)
rem empty the work directory
del /q workdir\*!identifier!.* 2>nul
rem check for any usage of the spread operator
node scripts\check_for_spread.js ..\..\!config_name! workdir\config_prefix!identifier!.txt workdir\spread_usage!identifier!.json
rem make sure we don't have old extension list
del extension_list 2>nul
del canceled 2>nul
rem make empty onel %d%touch extension_list >nul

set defaults_file=%d%defaults_%identifier%.js
set schema_file_exists=0
set FILE=!d!\schema3_!identifier!.json

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
   rem get all the non-default modules installed,
   rem we are in the modules folder so just back up one to get the list , make sure to ignore default it, default module dir is 'modules\default'
   for /f "tokens=1 delims=\ usebackq" %%i in (`dir  .. /b/ad ^| find /v "default"`) do @echo %%i >>somefile
   rem get all the default modules
   for /f "tokens=1 delims=\ usebackq" %%i in (`dir  ..\..\modules\default /b/ad  ^| find /V ".git" ^| find /V "node_modules"`) do @echo ..\modules\default\%%i>>somefile
   rem make a sorted unique list
   type somefile | powershell -nop "$input | sort -unique >somefile2.txt"
   rem delete the work file
   del somefile 2>nul
   rem delete the output to start fresh
   del defines.js 2>nul
   rem add the js header needed
   echo var config = require^('../../!config_name:\=/!'^) >%defaults_file%
   echo var defined_config = {  >>%defaults_file%
   rem loop thru all the files and process the defines for each
   for /f "tokens=1 usebackq delims=~" %%A in (`type somefile2.txt`) do  call :process_define "%%A"  %defaults_file%
   rem delete the work file
   del somefile2.txt 2>nul
   rem add the js trailer
   echo } >>%defaults_file%
   echo module.exports={defined_config,config};  >>%defaults_file%
   rem record that we processed for the modules now
   for /f "tokens=1,2 usebackq"  %%m in (`dir ..\..\ ^| find "!modules_location!" ^| find "<DIR>"`) do echo "%%m %%n" >!d!!modules_lastchange_file!
   set changed=1
)
rem check the generated defaults.js for errors
rem can only load/require it to find the errors
node scripts\test.js !defaults_file! 2>sss >nul
rem
rem if the file exists and the line count is greater than 0
if exist sss (
	set lc=0
	FOR /F "tokens=* usebackq" %%F IN (`type sss ^| find /c /v ""`) DO set lc=%%F
	rem echo line count =!lc!
  	 if !lc! NEQ 0 (
	   rem echo have error file and a line number
	   for /f "tokens=3 delims=: usebackq" %%i in (`type sss  ^| find "!defaults_file!" ^| head -n 1`) do set firstline=%%i
	   findstr /r /n /c:"_defaults:" !defaults_file! | perl -e "print reverse <>" >sss1
	   set firsttime=0
	   for /f "tokens=1,2 delims=:" %%a in (sss1) do (
	     set ml=%%a
		 set mname=%%b
		 rem echo !mname! at line !ml!
		 if !ml! LEQ !firstline! (
			if !firsttime!==0 (
				set firsttime=1
				for /f "tokens=1,2 delims=_"  %%a in ("!mname!") do (
				   set mname1=%%a-%%b
				   rem echo module name =!mname1!
				   set var_numeric=1
				   del sss1
				   FOR /f "tokens=1* delims=:" %%a IN ('findstr /n "^" "sss"') DO (
					   IF %%a==2 (
						   FOR /f "tokens=1 delims=:" %%x IN ("%%b") DO set varname=%%x
							set varname=!varname: =!
							set "XVALUE=!varname!"
							set /A XVALUE=!XVALUE!
							if "!XVALUE!" NEQ "!varname!"  set var_numeric=0
							FOR /L %%G IN (1,1,20) DO  echo | set /p=-
							echo MMM-Config
							echo module !mname1! has an error in the construction of its defaults section
							echo the error line is %%b
							if "!var_numeric!"=="1" (
							    echo config variables with numbers as names are not supported, please contact the module author
							) else (
								echo please change it to the literal value of the referenced variable
							)
							echo and restart MagicMirror
							FOR /L %%G IN (1,1,20) DO  echo | set /p=-
							echo MMM-Config
							rem copy the build error schema for form presentation
							copy /y schemas\MMM-Config-build-error.json !FILE! >nul
					   )
				   )
				)
			)
		 )
	   )
	del sss
	goto :done
	)
	del sss
)

rem proces for the web page in either modules list or config.js changed
if !config_lastsaved! neq !config_lastchanged!  (set changed=1)
if !modules_lastsaved! neq !modules_lastchanged!  (set changed=1)

	rem if somethign changed
	if !changed! equ 1 (
	rem regenerate the form schema file
	   node scripts\buildschema4.js !defaults_file! >!FILE!
	   rem set the last changed date.time info 
	   for /f "tokens=1-2,5 usebackq"  %%m in (`dir ..\..\%temp_config_name% ^| find "%config_filename%"`) do echo "%%m %%n" > %d%%config_lastchange_file%
	   rem check for any extensions in the schemas folder (we are shipping them, so not found in module folder) 
	   dir /b /s schemas\*_extension.* 2>nul >>extension_list
	   rem fixup config page html for extensions
	   node scripts/fixup.js config.html extension_list
	   rem drop the extensions list, not needed now
	   del extension_list >nul 2>nul
	)

echo completed
rem  for testing, launch browser to view form
rem  start msedge %d%\testit.html
goto :done
:getfilesize
set filesize=%~z1
goto :eof
:process_define
Setlocal EnableDelayedExpansion
		set m=%1
		set m=!m:~1,-1!
		set mf=..\!modules_location!
		rem parse to find if default module, will be a noop if not default, non-default variables set on entry
		for /f "tokens=1-5 delims=\ usebackq" %%a in (`echo !m!^| find "default"`) do (
		   set mf=..\modules\default
			set m=%%d
		)
		rem get rid of any trailing spaces
		for /f "usebackq tokens=1 delims= " %%B in ('!m!') do (
			set m=%%B
			rem echo."%m%"
		)
		rem if the module js exists
		IF EXIST "..\%mf%\%m%\%m%.js" (
			rem dump it to defauls
			node %d%scripts\dumpdefaults.js "..\%mf%\%m%\%m%.js" >>%2
			rem check for any extensions
			dir /b "..\%mf%\%m%\MMM-Config_extension.*" 2>nul >>"extension_list"
		)
  goto :eof
:done
