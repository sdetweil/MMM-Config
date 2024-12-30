@echo off
set d=%~dp0
if not "%~1" == "" goto okparm
   echo missing module name
   exit 1
:okparm 

FOR /F "eol=| delims=" %%I IN ('DIR "defaults*.js" /B /O-D /TW 2^>nul') DO (
    SET "NewestFile=%%I"
    GOTO FoundFile
)
echo missing defaults file
exit 2
:FoundFile
node  scripts\buildschema4.js %d%%NewestFile% saveform %1 >nul
