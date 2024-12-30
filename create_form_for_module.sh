#!/bin/bash
if [ "$1." == "." ]; then
   echo module name missing
   exit 1
fi
fn=$(ls defaults*.js -t | head -1)
node  scripts/buildschema4.js ../$fn saveform $2 >/dev/null
