# Troubleshooting Judge0 IDE Integration

This guide addresses common issues with Judge0 IDE integration, specifically focusing on the 404 error you're experiencing.

## The 404 Error Issue

From your screenshot, we can see the following error:

```
Not Found (404)
{
    "readyState": 4,
    "responseText": "The page could not be found\n\nNOT_FOUND\n\nbom1::vvhbl-1755004586791-d80d817a5e20\n",
    "status": 404,
    "statusText": "Not Found"
}
```

### Cause

This error occurs because:

1. The Judge0 IDE is trying to make an API request to a non-existent endpoint
2. The request is being made to your backend at `/api/programming-language/judge-api-v2/submissions` but this endpoint doesn't exist or isn't properly configured

### Solution Steps

1. **Check the API Configuration in the IDE**

   Open your IDE's `js/ide.js` file and locate the API endpoint configuration:

   ```javascript
   const API_ORIGIN = window.location.origin;
   const AUTHENTICATED_CE_BASE_URL = `${API_ORIGIN}/api/programming-language/judge-api-v2`;
   const AUTHENTICATED_EXTRA_CE_BASE_URL = `${API_ORIGIN}/api/programming-language/judge-api-v2`;
   ```

   Make sure these endpoints match your actual backend API endpoints.

2. **Verify Your Backend API**

   Check if your backend has the following endpoints implemented:
   
   - `POST /api/programming-language/judge-api-v2/submissions`
   - `GET /api/programming-language/judge-api-v2/submissions/{token}`

3. **Use a Proxy Approach**

   If you don't have a full Judge0 API implementation on your backend, you can modify the IDE to use the public Judge0 API for submissions while still using your custom API for running code against test cases:

   ```javascript
   // In js/ide.js
   
   // Use Judge0 public API for language listing and submission polling
   const UNAUTHENTICATED_CE_BASE_URL = "https://ce.judge0.com";
   const UNAUTHENTICATED_EXTRA_CE_BASE_URL = "https://extra-ce.judge0.com";
   
   // For submissions, you can also use the public API
   const AUTHENTICATED_CE_BASE_URL = "https://ce.judge0.com";
   const AUTHENTICATED_EXTRA_CE_BASE_URL = "https://extra-ce.judge0.com";
   ```

4. **Implement a Proxy on Your Backend**

   Create a proxy endpoint on your backend that forwards requests to the Judge0 API:

   ```javascript
   // Example Express.js proxy
   const express = require('express');
   const axios = require('axios');
   const app = express();
   
   app.post('/api/programming-language/judge-api-v2/submissions', async (req, res) => {
     try {
       const response = await axios.post('https://ce.judge0.com/submissions', req.body, {
         headers: {
           'Content-Type': 'application/json'
         }
       });
       res.json(response.data);
     } catch (error) {
       res.status(error.response?.status || 500).json(error.response?.data || { error: 'Internal Server Error' });
     }
   });
   
   app.get('/api/programming-language/judge-api-v2/submissions/:token', async (req, res) => {
     try {
       const response = await axios.get(`https://ce.judge0.com/submissions/${req.params.token}`, {
         params: req.query
       });
       res.json(response.data);
     } catch (error) {
       res.status(error.response?.status || 500).json(error.response?.data || { error: 'Internal Server Error' });
     }
   });
   ```

5. **Bypass the IDE's Default Run Button**

   The most straightforward solution is to completely override the IDE's run functionality with our bridge script:

   ```javascript
   // In judge0-ide-bridge.js
   
   // Override the run button to use our custom handler
   runButton.onclick = function(event) {
     // Get current code and language
     const code = sourceEditor.getValue();
     const languageId = languageSelect.value;
     const languageFlavor = languageSelect.options[languageSelect.selectedIndex].getAttribute('flavor');
     
     // Send to parent
     window.parent.postMessage({
       type: 'runCode',
       payload: {
         code,
         languageId,
         languageFlavor
       }
     }, '*');
     
     // Prevent default action
     event.preventDefault();
     return false;
   };
   ```

   This way, when the Run button is clicked, it will send the code to your React app instead of trying to use the Judge0 API directly.

6. **Use a Complete Judge0 Instance**

   If you need the full Judge0 functionality, consider setting up a complete Judge0 instance:
   
   - [Judge0 GitHub Repository](https://github.com/judge0/judge0)
   - [Judge0 Documentation](https://github.com/judge0/judge0/blob/master/README.md)

## Debugging the Communication

To debug the communication between your React app and the IDE:

1. **Add Console Logs to the Bridge Script**

   ```javascript
   // In judge0-ide-bridge.js
   
   window.addEventListener('message', (event) => {
     console.log('IDE received message:', event.data);
     // Rest of the code...
   });
   ```

2. **Add Console Logs to Your React Component**

   ```javascript
   // In your React component
   
   useEffect(() => {
     const handleMessage = (event) => {
       console.log('React received message:', event.data);
       // Rest of the code...
     };
     
     window.addEventListener('message', handleMessage);
     return () => window.removeEventListener('message', handleMessage);
   }, []);
   ```

3. **Check if Messages Are Being Sent**

   ```javascript
   // When sending a message from React to IDE
   const ideIframe = document.querySelector('iframe[src*="judge0"]');
   if (ideIframe) {
     console.log('Sending message to IDE:', { type: 'setBoilerplate', payload: { code: '...' } });
     ideIframe.contentWindow.postMessage({
       type: 'setBoilerplate',
       payload: { code: '...' }
     }, '*');
   } else {
     console.error('IDE iframe not found');
   }
   ```

## Testing the Integration

To test if the integration is working correctly:

1. **Test the Bridge Script**

   Add this to your browser console while the IDE is open:

   ```javascript
   window.postMessage({
     type: 'setBoilerplate',
     payload: {
       code: 'console.log("Hello, world!");',
       language: 'javascript'
     }
   }, '*');
   ```

   You should see the code appear in the IDE.

2. **Test the React to IDE Communication**

   Add this to your React component and trigger it with a button:

   ```javascript
   function testIdeConnection() {
     const ideIframe = document.querySelector('iframe[src*="judge0"]');
     if (ideIframe) {
       ideIframe.contentWindow.postMessage({
         type: 'setBoilerplate',
         payload: {
           code: 'console.log("Test from React");',
           language: 'javascript'
         }
       }, '*');
       console.log('Test message sent to IDE');
     } else {
       console.error('IDE iframe not found');
     }
   }
   ```

## Common Issues and Solutions

1. **Cross-Origin Issues**

   If you're hosting the IDE on a different domain, you might face CORS issues. Make sure:
   
   - Your IDE server allows your React app's origin in CORS headers
   - You're using `'*'` as the target origin in postMessage calls during development

2. **Iframe Not Loaded**

   The iframe might not be fully loaded when you try to send messages. Use a ready check:

   ```javascript
   function checkIdeReady() {
     const ideIframe = document.querySelector('iframe[src*="judge0"]');
     if (ideIframe && ideIframe.contentWindow) {
       try {
         // Try to access a property to check if the iframe is loaded
         if (ideIframe.contentWindow.document) {
           console.log('IDE iframe is ready');
           return true;
         }
       } catch (e) {
         // Cross-origin error, the iframe might not be fully loaded
         console.log('IDE iframe not ready yet');
       }
     }
     return false;
   }
   ```

3. **API Key Issues**

   If you're using the public Judge0 API, you might need an API key. Check if you need to set:

   ```javascript
   const API_KEY = "your-api-key"; // Get yours at https://platform.sulu.sh/apis/judge0
   
   const AUTH_HEADERS = API_KEY ? {
       "Authorization": `Bearer ${API_KEY}`
   } : {};
   ```

By following these troubleshooting steps, you should be able to resolve the 404 error and get your Judge0 IDE integration working properly.
