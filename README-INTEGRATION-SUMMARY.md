# Judge0 IDE Integration - Summary

This package contains all the files needed to fix your Judge0 IDE integration issues and implement proper communication between your React app and the IDE.

## Files Included

1. **`js/judge0-ide-bridge.js`**: The enhanced bridge script to add to your hosted Judge0 IDE
2. **`js/judge0-react-component.jsx`**: A React component you can use in your application
3. **`IMPLEMENTATION-GUIDE.md`**: Step-by-step guide to implement the integration
4. **`TROUBLESHOOTING.md`**: Solutions for common issues, including the 404 error
5. **`test-integration.html`**: A standalone HTML file to test the integration

## Quick Start

### 1. Fix the 404 Error

The 404 error you're seeing is because the IDE is trying to access an API endpoint that doesn't exist. To fix this:

1. **Option A: Configure your backend**
   - Implement the Judge0-compatible API endpoints on your backend
   - `/api/programming-language/judge-api-v2/submissions` should handle code execution

2. **Option B: Use the public Judge0 API**
   - Modify `js/ide.js` in your Judge0 IDE to use the public API:
   ```javascript
   const AUTHENTICATED_CE_BASE_URL = "https://ce.judge0.com";
   const AUTHENTICATED_EXTRA_CE_BASE_URL = "https://extra-ce.judge0.com";
   ```

3. **Option C: Create a proxy on your backend**
   - Create endpoints that forward requests to the Judge0 API

### 2. Add the Bridge Script

1. Copy `js/judge0-ide-bridge.js` to your hosted Judge0 IDE
2. Add this script to your IDE's HTML file at the end of the body:
   ```html
   <!-- Judge0 IDE Bridge Script for React App Integration -->
   <script src="js/judge0-ide-bridge.js"></script>
   ```

### 3. Update Your React Component

Use the provided React component or implement the communication in your existing component:

```jsx
// In your React component
useEffect(() => {
  function handleMessage(event) {
    const { type, payload } = event.data || {};
    
    if (type === 'ideReady') {
      // IDE is ready, send boilerplate code
      const ideIframe = document.querySelector('iframe[src*="judge0"]');
      ideIframe.contentWindow.postMessage({
        type: 'setBoilerplate',
        payload: {
          code: question.boilerplateCode,
          language: question.language
        }
      }, '*');
    }
  }
  
  window.addEventListener('message', handleMessage);
  return () => window.removeEventListener('message', handleMessage);
}, [question]);
```

### 4. Test the Integration

Use the `test-integration.html` file to test if the bridge script is working correctly:

1. Open the HTML file in a browser
2. Enter the URL of your hosted Judge0 IDE
3. Click "Load IDE"
4. Test sending boilerplate code and test cases

## Fixing Your Specific Issues

Based on your screenshot, you need to:

1. **Fix the 404 error** using one of the options above
2. **Implement proper communication** between your React app and the IDE
3. **Load boilerplate code** when the IDE is ready
4. **Load test cases** when the "Load in IDE" button is clicked
5. **Run code against test cases** when the "Run with Test Cases" button is clicked

## Next Steps

1. Follow the detailed instructions in `IMPLEMENTATION-GUIDE.md`
2. If you encounter issues, refer to `TROUBLESHOOTING.md`
3. Use the provided React component or implement the communication yourself

## Testing

To verify that the integration is working:

1. The IDE should load without errors
2. Boilerplate code should appear in the IDE
3. Test cases should load when "Load in IDE" is clicked
4. Code should run against test cases when "Run with Test Cases" is clicked
5. Results should display in both your React app and the IDE

## Support

If you need further assistance:

1. Check the browser console for errors
2. Add console logs to debug the communication
3. Verify that the bridge script is properly loaded in the IDE
4. Check that your API endpoints are correctly configured

Good luck with your integration!
