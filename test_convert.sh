#!/bin/bash
# convert modules to info for remote UI

base=MagicMirror
d=$(dirname "$(realpath $0)")
mod_lastchange=$(stat --printf="%y %n\n" ~/$base/* | grep "/modules$" | awk -F. '{print $1}')
config_lastchange=$(stat --printf="%y %n\n" ~/$base/config/*.js | grep "/config.js$" | awk -F. '{print $1}')
touch $d/config_lastchange
config_lastsaved=$(cat $d/config_lastchange)
touch $d/modules_lastchange
mod_lastsaved=$(cat $d/modules_lastchange)
defaults_file=$d/defaults.js
modules_changed=0
schema_file_exists=0
FILE=$d/schema3.json
if [ -f "$FILE" ]; then
    schema_file_exists=1
fi
# if the modules changes
if [ "$mod_lastsaved". != "$mod_lastchange". -o $schema_file_exists -eq 0 ]; then
	#get to the the modules list
	cd ~/$base/modules
	# get the list of installed modules, including defaults
	list=$(find . -maxdepth 1 -type d | grep -v default | awk -F/ '{ print ($2 =="default" && $3 !="") ? "default/"$3 :  ($2 !="default") ? $2: ""}' | uniq )
	list1=$(find ./default -maxdepth 1 -type d | awk -F/ '{ print ($2 =="default" && $3 !="") ? "default/"$3 :  ($2 !="default") ? $2: ""}' | uniq )
	listf="$list$list1"
	modules=($listf)
	echo "const config = require('../../config/config.js')" >$defaults_file
	echo "var defined_config = {"  >>$defaults_file
	for module in "${modules[@]}"
	do
		nm=$module
		if [[ $nm =~ "/" ]]; then
			nm=$(echo $nm| awk -F/ '{ print $2}')
		fi
		# echo "// processing for module "
		cd $module
		#echo looking for $nm.js
		if [ -e $nm.js ]; then
		   node $d/dumpdefaults.js $nm.js >>$defaults_file
		else
			echo "// file $nm.js does NOT exists"
		fi
		cd - >/dev/null
	done
	echo "}" >>$defaults_file
	echo "module.exports={defined_config,config};"  >>$defaults_file
	cd - >/dev/null
	modules_changed=1
	echo $mod_lastchange>$d/modules_lastchange
fi
# if the config changed since last start or the modules changed
if [ "$config_lastsaved". != "$config_lastchange". -o $modules_changed == 1  ]; then
	cd $d
	node ./buildschema2.js $defaults_file >$FILE
	echo $config_lastchange>$d/config_lastchange
fi
echo completed
# for testing, launch browser to view form
# 'chromium-browser' --app=file://$d/testit.html
exit
