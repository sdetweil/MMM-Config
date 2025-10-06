#!/bin/bash

curl_found=$(which curl | wc -l)
wget_found=$(which wget | wc -l)

url=$1

if [ $wget_found -gt 0 ]; then
  wget -O - $url 2>/dev/null
elif [ $curl_found -gt 0 ]; then
  curl -sL $url stdout 2>/dev/null
fi
   