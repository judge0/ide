#!/bin/sh

if [ -z "$API_URL" ]; then
  echo "No API_URL set. Skipping replacement."
  return 0 2>/dev/null || exit 0
fi

echo "Setting API URL to: $API_URL"

# Replace hardcoded judge0 URLs with your self-hosted API URL
sed -i "s#https://ce.judge0.com#${API_URL}#g" /usr/share/nginx/html/js/ide.js
sed -i "s#https://extra-ce.judge0.com#${API_URL}#g" /usr/share/nginx/html/js/ide.js

# Remove external status message polling if present
sed -i "s#loadMessages();##g" /usr/share/nginx/html/js/ide.js
