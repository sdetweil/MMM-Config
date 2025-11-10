#!/bin/bash
known_list="request valid-url jsdom node-fetch digest-fetch"
modules_path=../../../modules
module_name=$1
module_url=$2
keyfile=package.json
doinstalls=true
JustProd=--omit=dev
logfile=install.log
true=1
doinstalls=$true
JustProd="--no-audit --no-fund --no-update-notifier --no-warn"
export npm_config_loglevel=silent

cd "$(dirname "$0")"

check_update_dependencies() {
    # we are in the module folder
    mod=node_helper.js
    # if the node_helper exists
    if [ -e $mod ]; then
		# get the require statetents from the node helper
		requires=($(egrep -v "^(//|/\*| \*)" $mod | grep -e "require("  | awk -F '[()]' '{print $2}' | grep -v "\.js" | grep -v -e node_helper -e moment -e logger | tr -d '"' | tr -d "'"))
		# check if we found any requires for outside  modules
		if [ ${#requires[@]} -gt 0 ]; then
			if [ ! -e $keyfile ]; then
				echo -e ' \n\t ' $keyfile not found for module $mod for library $require >> $logfile
				#if [ $doinstalls == $true ]; then
					#echo adding package.json for module $mod | tee -a $logfile
					npm init -y >>$logfile
				#else
				#	echo -e ' \n\t\t 'bypass adding package.json for module $mod, doing test run | tee -a $logfile
				#fi
			fi
			# loop thru the requires
			for require in "${requires[@]}"
			do
				# check it against the list of known lib removals
				case " $known_list " in (*" $require "*) :;; (*) false;; esac
				# if found in the list
				if [ $? == 0 ]; then
					# if package.json exists, could have been just added
					if [ -e $keyfile ]; then
						# check for this library in the package.json
						pk=$(grep $require\" $keyfile)
						# if not present, need to do install
						if [ "$pk." == "." ]; then
							echo -e " \n\t require for \e[91m$require\e[0m in module \e[33m$mod\e[0m not found in $keyfile" | tee -a $logfile
							if [ $doinstalls == $true ]; then
								echo installing $require for module $mod | tee -a $logfile
								if [ $require == "node-fetch" ]; then
											require="$require@2"
								fi
								npm install $require $JustProd --save --omit=dev 2>&1 >>$logfile
							fi
						fi
					fi
					#cd - >/dev/null
				else
					# not in the known list
					if [ -e $keyfile ]; then
						# check for this library in the package.json
						pk=$(grep $require\" $keyfile)
						# if not present, need to do install
						if [ "$pk." == "." ]; then
							echo -e " \n\t require for \e[91m$require\e[0m in module \e[33m$mod\e[0m not found in $keyfile" | tee -a $logfile
							if [ $doinstalls == $true ]; then
								echo installing $require for module $mod | tee -a $logfile
								if [ $require == "node-fetch" ]; then
											require="$require@2"
								fi
								npm install $require $JustProd --save --omit=dev 2>&1 >>$logfile
							fi
						fi
					fi
				fi
			done
		fi
	fi

}
	cd $modules_path
		echo "received request to install module " $module_name from $module_url
		if [ ! -d $module_name ]; then
			git clone $module_url >install.log 2>&1
			mv install.log $module_name
		fi
		cd $module_name
		if [ -e node_helper.js  ]; then
			check_update_dependencies
			pwd
			if [ -e $keyfile -a $(grep '"dependencies":' $keyfile |wc -l) -gt 0 ]; then
				npm install --omit=dev 2>&1 >>install.log
			fi
		fi
	cd - >/dev/null
