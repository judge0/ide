#! /bin/bash

if [ -z "$API_URL" ]

then
  echo No API Environment Variable Set. Set "-e API_URL='your-server.tld'" in your Docker Config
else
  if [ -f /api_set ]
  then
    echo API URL Already set to $API_URL
  else
    echo Setting API URL to: $API_URL
    sed -i "s#var apiUrl = localStorageGetItem("api-url")#var apiUrl = '$API_URL'#" /usr/share/nginx/html/js/ide.js
  
    echo Disabling messages from public Judge CE API
    sed -i "s^loadMessages();^^1" /usr/share/nginx/html/js/ide.js
    
    touch /api_set
  fi
fi
