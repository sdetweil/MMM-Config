#!/bin/bash

#
#  make url hash with corrected url
#

hash_file=somefile.txt #module_url_hash.json


mapfile -t list < $hash_file

for url_entry in "${list[@]}"
do

	temp=$(echo $url_entry | tr -d ',')
    if [ "$temp" == "{" -o "$temp" == "}" ]; then
    	echo $url_entry
    else
    	# doing fixup
    	if [ $(echo $temp | grep '"readme_url":"null"' | wc -l ) -ne 0 ]; then
		    module_name=$(echo $url_entry | tr -d ',"' | awk -F: '{print $1}')
		    readme_url=$(echo $url_entry | tr -d ',"' | awk -F: '{print $2}')
		    url=$(echo $url_entry | tr -d ',"' | awk '{print $2}')
	    	if [[ "$temp" = *.html\" ]]; then
	    		echo \"$module_name\": { \"readme_url\":\"$url\", \"repo_url\":\"$url\" },
	    	else
	    		#echo processing for $url_entry

		    	#echo prefix=$prefix url=$url
		    	newurl=$(curl -sL $url &> /dev/stdout | node module_installer/fixupurl.js $url)
				echo \"$module_name\": { \"readme_url\":\"$newurl\", \"repo_url\":\"$url\" },
		    	sleep $(awk 'BEGIN{srand();print int(rand()*15) }')
		    fi
		else
			echp $url_entry
		fi
    	#curl -sL node module_installer/fixupurl.js <
    fi
done
