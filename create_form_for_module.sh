#!/bin/bash
if [ "$1." == "." ]; then
   echo module name missing
   exit 1
fi
node  scripts/buildschema4.js ../defaults.js saveform $1 >/dev/null
