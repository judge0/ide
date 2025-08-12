# Judge0 IDE Integration Implementation Guide

This guide will help you fix the issues with your Judge0 IDE integration and properly implement the communication between your React app and the IDE.

## Current Issues

Based on your screenshot, there are two main issues:

1. The Judge0 IDE is showing a 404 error
2. The communication between your React app and the IDE isn't working correctly

## Solution

### 1. Fix the 404 Error

The 404 error indicates that the Judge0 IDE can't find the API endpoint it's trying to access. This is likely because:

- The IDE is trying to use its default API endpoint
- Your backend API is not properly configured or not accessible

To fix this:

1. Make sure your Judge0 API is running and accessible
2. Configure the IDE to use your custom API endpoint

### 2. Implement the Bridge Script

1. Add the updated `judge0-ide-bridge.js` script to your hosted Judge0 IDE
2. Make sure it's included in your IDE's HTML file at the end of the body:

```html
<!-- Judge0 IDE Bridge Script for React App Integration -->
<script src="js/judge0-ide-bridge.js"></script>
```

### 3. Update Your React Component

Use the provided `Judge0IDE` component in your React application:

```jsx
import React from 'react';
import Judge0IDE from './path/to/judge0-react-component';

function QuestionTypeCoding({ question }) {
  // Handle code changes
  const handleCodeChange = (code) => {
    console.log('Code changed:', code);
    // Update your state or perform other actions
  };

  // Handle run code
  const handleRunCode = (code, languageId) => {
    console.log('Running code:', code, languageId);
    // Call your API to run the code against test cases
    // Then send results back to the IDE
  };

  // Format test cases for the IDE component
  const testCases = question.testCases.map(tc => ({
    input: tc.input,
    expectedOutput: tc.output
  }));

  return (
    <div>
      <h2>{question.title}</h2>
      <div className="question-description">
        {question.description}
      </div>
      
      <Judge0IDE
        ideUrl="https://your-hosted-judge0-ide.com"
        boilerplateCode={question.boilerplateCode}
        language={question.language}
        testCases={testCases}
        onCodeChange={handleCodeChange}
        onRunCode={handleRunCode}
      />
    </div>
  );
}

export default QuestionTypeCoding;
```

## Specific Implementation for Your Application

Based on your screenshot, here's how to implement this for your specific application:

### 1. Update Your Judge0 IDE Configuration

In your Judge0 IDE's `js/ide.js` file, update the API endpoints to point to your backend:

```javascript
// Point IDE to your backend wrapper that implements Judge0-compatible endpoints
const API_ORIGIN = window.location.origin;
const AUTHENTICATED_CE_BASE_URL = `${API_ORIGIN}/api/programming-language/judge-api-v2`;
const AUTHENTICATED_EXTRA_CE_BASE_URL = `${API_ORIGIN}/api/programming-language/judge-api-v2`;
```

Make sure these endpoints actually exist on your backend.

### 2. Implement the Test Case Loading

For your "Load in IDE" buttons:

```jsx
function loadTestCaseInIDE(testCase) {
  // Get a reference to the iframe
  const ideIframe = document.querySelector('iframe[src*="judge0"]');
  
  if (ideIframe) {
    ideIframe.contentWindow.postMessage({
      type: 'setInput',
      payload: {
        stdin: testCase.input
      }
    }, '*');
  }
}

// Add this to your "Load in IDE" button click handlers
<button onClick={() => loadTestCaseInIDE(testCase)}>
  Load in IDE
</button>
```

### 3. Implement the "Run with Test Cases" Button

```jsx
async function runWithTestCases() {
  // Get a reference to the iframe
  const ideIframe = document.querySelector('iframe[src*="judge0"]');
  
  if (ideIframe) {
    // First, get the current code from the IDE
    ideIframe.contentWindow.postMessage({
      type: 'getCode'
    }, '*');
    
    // Then handle the response in your message event listener
    // and call your API to run the code against test cases
  }
}

// Add this to your "Run with Test Cases" button
<button onClick={runWithTestCases}>
  Run with Test Cases
</button>
```

### 4. Handle Messages from the IDE

```jsx
useEffect(() => {
  function handleMessage(event) {
    const { type, payload } = event.data || {};
    
    switch (type) {
      case 'codeContent':
        // Got code from the IDE after calling getCode
        runCodeAgainstTestCases(payload.code, payload.languageId);
        break;
        
      case 'runCode':
        // Run button was clicked in the IDE
        runCodeAgainstTestCases(payload.code, payload.languageId);
        break;
    }
  }
  
  window.addEventListener('message', handleMessage);
  return () => window.removeEventListener('message', handleMessage);
}, []);

async function runCodeAgainstTestCases(code, languageId) {
  try {
    // Call your API to run the code against test cases
    const response = await fetch('/api/run-code', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        code,
        languageId,
        testCases: question.testCases
      })
    });
    
    const results = await response.json();
    
    // Send results back to the IDE
    const ideIframe = document.querySelector('iframe[src*="judge0"]');
    if (ideIframe) {
      ideIframe.contentWindow.postMessage({
        type: 'runResults',
        payload: {
          success: true,
          summary: {
            total: results.length,
            passed: results.filter(r => r.passed).length,
            failed: results.filter(r => !r.passed).length
          },
          output: results
        }
      }, '*');
    }
  } catch (error) {
    console.error('Error running code:', error);
    
    // Send error back to the IDE
    const ideIframe = document.querySelector('iframe[src*="judge0"]');
    if (ideIframe) {
      ideIframe.contentWindow.postMessage({
        type: 'runResults',
        payload: {
          success: false,
          error: error.message
        }
      }, '*');
    }
  }
}
```

### 5. Load Boilerplate Code When the Page Loads

```jsx
useEffect(() => {
  // Check if the IDE is ready before sending boilerplate code
  let ideReadyCheck = setInterval(() => {
    const ideIframe = document.querySelector('iframe[src*="judge0"]');
    if (ideIframe && ideIframe.contentWindow) {
      try {
        // Check if the bridge is active
        if (ideIframe.contentWindow.isJudge0BridgeActive) {
          clearInterval(ideReadyCheck);
          
          // Send boilerplate code
          ideIframe.contentWindow.postMessage({
            type: 'setBoilerplate',
            payload: {
              code: question.boilerplateCode,
              language: question.language
            }
          }, '*');
        }
      } catch (e) {
        // Cross-origin error, the iframe might not be fully loaded
        console.log('Waiting for IDE to be ready...');
      }
    }
  }, 500);
  
  // Clean up
  return () => clearInterval(ideReadyCheck);
}, [question]);
```

## Debugging Tips

1. Add console logs to check if messages are being sent and received
2. Check the browser console for errors
3. Make sure your API endpoints are correctly configured
4. Verify that the Judge0 IDE is properly loading all required scripts
5. Use the browser's network tab to check for API errors

By following this guide, you should be able to fix the 404 error and properly implement the communication between your React app and the Judge0 IDE.
