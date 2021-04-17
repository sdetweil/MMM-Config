rem
rem port of unix script
rem
 
set base=MagicMirror
set d=%~dp0

rem make sure the lastchanged files exist
call  touch %d%modules_lastchanges >nul
call touch %d%config_lastchanged >nul

rem get the contents of the last changed files 
for /f "delims=" %%x in (%d%modules_lastchanged) do (set modules_lastsaved=%%x)
for /f "delims=" %%x in (%d%config_lastchanged) do (set config_lastsaved=%%x)

@rem get the current module and config file last changed dates
@for /f "tokens=1,2"  %%m in ('dir ..\..\ ^| find "modules"') do (set module_lastchanged=%%m %%n)  
@for /f "tokens=1,2"  %%m in ('dir ..\..\config\config.js ^| find "config.js"') do (set config_lastchanged=%%m %%n)

set defaults_file=%d%\defaults.js

if "%modules_lastsaved%" neq "%module_lastchanged%" (
rem 
rem    if modules folder change date doesn't match saved
rem       
       cd %d%
       del somefile 2>nul
       for /f "tokens=6 delims=\ usebackq" %%i in (`dir  .. /s/b/ad *`) do @echo %%i >>somefile  
       type somefile | powershell -nop "$input | sort -unique >somefile2.txt
	   del somefile 2>/nul
	   del defines.js 2>/nul	
	   for /f "delims=^\ tokens=2,3 usebackq" %%x in (`echo %USERPROFILE%`) do (set c=%%x/%%y)
	  rem echo var cfg = '%HOMEDRIVE%/%c%/MagicMirror/config/config.js' >%defaults_file%
	   echo var config = require^('%HOMEDRIVE%/%c%/MagicMirror/config/config.js'^) >%defaults_file% 
	   echo var defined_config = {  >>%defaults_file%
       for /f "tokens=1 usebackq" %%A in (`type somefile2.txt`) do (node %d%\dumpdefaults.js "..\%%A\%%A.js" ) >>%defaults_file%
	   del somefile2.txt 2>/nul
	   echo } >>%defaults_file%
	   echo module.exports={defined_config,config};  >>%defaults_file%
	   for /f "tokens=1,2 usebackq"  %%m in (`dir ..\..\ ^| find "modules"`) do echo %%m %%n >%d%modules_lastchanged
)	   
if "%config_lastsaved%" neq "%config_lastchanged% " or if "%modules_lastsaved%" neq "%module_lastchanged% "  (
	   node buildschema.js %defaults_file% >schema2.js
       for /f "tokens=1,2 usebackq"  %%m in (`dir ..\..\config\config.js ^| find "config.js"` ) do echo %%m %%n > %d%config_lastchanged
)	   