@rem
set d=%~dp0
if [%1]!=[] goto okparm
   echo missing module name
   exit 1
:okparm 
node  scripts\buildschema4.js %d%defaults.js saveform %1 >nul
