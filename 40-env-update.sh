#!/bin/bash
if [ -z "$API_URL" ]; then
  echo "No API_URL set. Use -e API_URL='https://your-judge0.tld'"
  exit 0
fi

echo "Setting API URL to: $API_URL"
sed -i 's#var apiUrl = localStorageGetItem("api-url") || "https://ce.judge0.com";#var apiUrl = "'"$API_URL"'";#' /usr/share/nginx/html/js/ide.js
sed -i 's#loadMessages();##' /usr/share/nginx/html/js/ide.js