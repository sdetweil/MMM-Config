#!/bin/bash
if [ "$1." == "." ]; then
   echo module name missing
   exit 1
fi
output=/dev/null
if [ "$3." != "." ]; then 
   echo setting output to $3
   output=$3
fi

fn=$(ls -t defaults*.js | head -1)
node  scripts/buildschema4.js ../$fn saveform $1 $2 >$output
