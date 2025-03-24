#!/bin/bash 
# convert modules to info for remote UI
identifier=$MM_identifier
# get the configured modules location or use the default
modules_location=${MM_MODULES_DIR:-modules}
# get the config file name, or use the default
config_name=${MM_CONFIG_FILE:-config/config.js}
# if the config name is JUST the name (no folder)
if [ ! $(echo $config_name | grep '/') ]; then
	# add the default folder name
	config_name=config/$config_name
fi
config_lastchange_file=config_lastchange_$identifier
modules_lastchange_file=modules_lastchange_$identifier
del canceled 2>/dev/null
# if this is a mac
if [ $(uname -s) == 'Darwin' ]; then
	d=$( cd "$(dirname "$0")" ; pwd -P )
	mod_lastchange=$(GetFileInfo -m $d/../../$modules_location | tr / - | awk '{print $1  " "  $2}')
	config_lastchange=$(GetFileInfo -m $d/../../$config_name | tr / - | awk '{print $1  " "  $2}')
else # not mac
	d=$(dirname "$(realpath $0)")
	mod_lastchange=$(stat --printf="%y %n\n" $d/../../$modules_location | awk -F. '{print $1}')
	config_lastchange=$(stat --printf="%y %n\n" $d/../../$config_name | awk -F. '{print $1}')
fi
touch $d/$config_lastchange_file
config_lastsaved=$(cat $d/$config_lastchange_file)
touch $d/$modules_lastchange_file
mod_lastsaved=$(cat $d/$modules_lastchange_file)
defaults_file=$d/defaults_${identifier}.js
modules_changed=0

rm $d/extension_list 2>/dev/null
rm $d/sss 2>/dev/null
rm $d/canceled 2>/dev/null
schema_file_exists=0
FILE=$d/schema3_${identifier}.json
#if the output file exists
if [ -f "$FILE" ]; then
	# are we NOT overriding the change date
	if [ "$1". != "override." ]; then
		# says so
    	schema_file_exists=1
	fi
fi

# if the modules changes
if [ "$mod_lastsaved". != "$mod_lastchange". -o $schema_file_exists -eq 0 ]; then
	#get to the the modules list
	cd $d
	if [ ! -e config.html ]; then
		cp templates/config.html .
	fi
	# check if list of animations has the export we need
	# if not copy and add the export
	rm animateCSS.js 2>/dev/null
	if [ $(grep export ../../js/animateCSS.js | wc -l) -eq 0 ]; then
		cp ../../js/animateCSS.js . >/dev/null
		echo "if (typeof window === 'undefined') module.exports = { AnimateCSSIn, AnimateCSSOut };" >> ./animateCSS.js
	fi
	# empty the work directory
	rm  workdir/*${identifier}.* 2>/dev/null
	# check for any usage of the spread operator
	node scripts/check_for_spread.js ../../$config_name $d/workdir/config_prefix${identifier}.txt $d/workdir/spread_usage${identifier}.json
	rm extension_list 2>/dev/null
	touch extension_list
	# get the list of installed modules, including defaults
	NL=$'\n'
	list=$(find .. -maxdepth 1 -type d | grep -v default | awk -F/ '{print substr($0,index($0,$5))}' )
	list1=$(find ../../modules/default -maxdepth 1 -type d |  awk  '{print substr($0,index($0,$5))}')
	listf="$list${NL}$list1"
	IFS=$'\n'

	echo "const config = require('../../$config_name')" >$defaults_file
	echo "var defined_config = {"  >>$defaults_file
	modules=($listf)
	for module in "${modules[@]}"
	do
		nm=$module
		if [[ "$nm" =~ "/" ]]; then
			if [[ "$nm" =~ "default" ]]; then
				nm=$(echo "$nm"| awk -F/ '{ print $5}')
			else
				nm=$(echo "$nm"| awk -F/ '{ print $2}')
			fi
		fi
		# echo "// processing for module "

		#echo looking for "$nm.js"
		if [ -e "$module/$nm".js ]; then
		   node $d/scripts/dumpdefaults.js "$module/$nm.js" >>$defaults_file
		   ls $module/MMM-Config_extension.* 2>/dev/null >>extension_list
		else
			#echo "// file "$nm.js" does NOT exist"
			:
		fi


	done
	echo "}" >>$defaults_file
	echo "module.exports={defined_config,config};"  >>$defaults_file

	# now lets test the built defaults file for any syntax errors
	# they will be reported on stderr
	node ./scripts/test.js $defaults_file 2>sss >/dev/null
	# if the file exists and the line count is greater than 0
	if [ -e sss -a $(wc -c "sss"| awk '{print $1}') -gt 0 ]; then
		# get the line number of the error
		ln=$(cat sss | awk -F: '{print $2}' | grep -m1 .)
		# find the lines with the module names as first character on line (not blank)
		# AND the line number is less than in the reported error
		# extract and reconstruct the module name
		mname=$(grep -n -v "^\s" $defaults_file | awk 'NR>2' | tac | awk -F: '$1<='$ln| head -n1 | awk -F: '{print $2}' | awk -F_ '{print $1"-"$2}')
		# all done with error file
		error=$(grep  "^\s" -m1 sss)
		nerror=$(echo $error | awk -F: '{print $1}')
		if [ -n "$nerror" ] && [ "$nerror" -eq "$nerror" ] 2>/dev/null; then
		  isnumber=true
		else
		  isnumber=false
		fi
		printf '%.s-' {1..20}
		echo MMM-Config
		echo module $mname has an error in the construction of its defaults section
		echo the error line is "$error"
		if [ $isnumber == false ]; then
			echo please change it to the literal value of the referenced variable
		else
			echo config variables with numbers as names are not supported, please contact the module author
		fi
		echo and restart MagicMirror
		printf '%.s-' {1..20}
		echo MMM-Config
		# copy the build error schema for form presentation
		cp schemas/MMM-Config-build-error.json  $FILE
		rm extension_list 2>/dev/null
		rm sss 2>/dev/null
		# we cant continue
		exit 0
	fi
	rm sss 2>/dev/null
	modules_changed=1
	echo $mod_lastchange>$d/$modules_lastchange_file
fi
# if the config changed since last start or the modules changed
if [ "$config_lastsaved". != "$config_lastchange". -o $modules_changed == 1  ]; then
	cd $d
	node ./scripts/buildschema4.js ${defaults_file} >$FILE
	echo $config_lastchange>$d/$config_lastchange_file
	# look for global extensions (built in modules or whatever)
	ls schemas/*_extension.* 2>/dev/null >>extension_list
	# fixup config page html for extensions
	node scripts/fixup.js config.html extension_list
	rm extension_list 2>/dev/null
fi
echo completed
# for testing, launch browser to view form
# 'chromium-browser' --app=file://$d/testit.html
exit
