#!/bin/sh

if [ -z "$API_URL" ]; then
  echo "No API_URL set. Skipping replacement."
  return 0 2>/dev/null || exit 0
fi

echo "Setting API URL to: $API_URL"

# Replace the default API URL variable in ide.js
sed -i "s#var apiUrl = localStorageGetItem(\"api-url\") || \"https://ce.judge0.com\";#var apiUrl = \"${API_URL}\";#" /usr/share/nginx/html/js/ide.js
sed -i "s#loadMessages();##" /usr/share/nginx/html/js/ide.js

# Hard-override local storage fallback directly at top of script
sed -i "1s#^#localStorage.setItem('api-url', '${API_URL}');\n#" /usr/share/nginx/html/js/ide.js

# Force unregister service workers
sed -i "1s#^#if ('serviceWorker' in navigator) { navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.unregister())); }\n#" /usr/share/nginx/html/js/ide.js
