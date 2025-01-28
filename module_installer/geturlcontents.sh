#!/bin/bash 

curl_found=$(which curl1 | wc -l)
wget_found=$(which wget | wc -l)

url=$1

if [ $curl_found -gt 0 ]; then
   curl -sL $url stdout 2>/dev/null
elif [ $wget_found -gt 0 ]; then
  wget -O - $url 2>/dev/null
fi
   