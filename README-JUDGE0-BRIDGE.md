# Judge0 IDE Integration

This guide explains how to integrate your hosted Judge0 IDE with your React application using the provided bridge script.

## Installation Instructions

### 1. Add the bridge script to your hosted Judge0 IDE

1. Copy the `judge0-ide-bridge.js` file to your hosted Judge0 IDE in the `js` directory
2. Add the script to your IDE's HTML file at the end of the body:

```html
<!-- Judge0 IDE Bridge Script for React App Integration -->
<script src="js/judge0-ide-bridge.js"></script>
```

### 2. Update your React app

Make sure your React component includes the necessary code to communicate with the IDE:

```jsx
// Example React component code
import React, { useEffect, useRef } from 'react';

function QuestionTypeCoding() {
  const iframeRef = useRef(null);
  
  // Listen for messages from the IDE
  useEffect(() => {
    const handleMessage = (event) => {
      const { type, payload } = event.data || {};
      
      switch (type) {
        case 'ideReady':
          // IDE is ready, you can send initial data
          sendBoilerplateCode();
          break;
          
        case 'codeChanged':
          // Code was changed in the IDE
          setCode(payload.code);
          break;
          
        case 'runCode':
          // Run button was clicked in the IDE
          runCodeWithTestCases(payload.code, payload.languageId);
          break;
          
        case 'codeContent':
          // Response to getCode request
          console.log('Code content received:', payload);
          break;
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);
  
  // Send boilerplate code to the IDE
  const sendBoilerplateCode = () => {
    iframeRef.current.contentWindow.postMessage({
      type: 'setBoilerplate',
      payload: {
        code: '// Your boilerplate code here',
        language: '71' // Language ID or name
      }
    }, '*');
  };
  
  // Send test input to the IDE
  const loadTestCase = (input) => {
    iframeRef.current.contentWindow.postMessage({
      type: 'setInput',
      payload: {
        stdin: input
      }
    }, '*');
  };
  
  // Request current code from the IDE
  const getCode = () => {
    iframeRef.current.contentWindow.postMessage({
      type: 'getCode'
    }, '*');
  };
  
  // Send test results back to the IDE
  const sendResults = (results) => {
    iframeRef.current.contentWindow.postMessage({
      type: 'runResults',
      payload: results
    }, '*');
  };
  
  return (
    <div>
      <iframe 
        ref={iframeRef}
        src="https://your-hosted-judge0-ide.com"
        style={{ width: '100%', height: '600px', border: 'none' }}
        title="Judge0 IDE"
      />
      <button onClick={() => loadTestCase('test input')}>
        Load Test Case
      </button>
      <button onClick={getCode}>
        Get Code
      </button>
    </div>
  );
}
```

## Communication Protocol

### Messages from React App to IDE

1. `setBoilerplate`: Set the initial code and language
   ```js
   {
     type: 'setBoilerplate',
     payload: {
       code: '// Your code here',
       language: '71' // Language ID or name
     }
   }
   ```

2. `setInput`: Set the stdin content
   ```js
   {
     type: 'setInput',
     payload: {
       stdin: 'Test input data'
     }
   }
   ```

3. `getCode`: Request the current code from the IDE
   ```js
   {
     type: 'getCode'
   }
   ```

4. `runResults`: Send test results to display in the IDE
   ```js
   {
     type: 'runResults',
     payload: {
       success: true,
       summary: {
         total: 3,
         passed: 2,
         failed: 1
       },
       output: [
         {
           input: 'test input',
           expectedOutput: 'expected output',
           actualOutput: 'actual output',
           passed: true
         },
         // More test cases...
       ]
     }
   }
   ```

5. `focus`: Focus the editor
   ```js
   {
     type: 'focus'
   }
   ```

### Messages from IDE to React App

1. `ideReady`: Sent when the IDE is fully loaded and ready
   ```js
   {
     type: 'ideReady'
   }
   ```

2. `codeChanged`: Sent when the code in the editor changes
   ```js
   {
     type: 'codeChanged',
     payload: {
       code: '// Updated code'
     }
   }
   ```

3. `runCode`: Sent when the Run button is clicked in the IDE
   ```js
   {
     type: 'runCode',
     payload: {
       code: '// Code to run',
       languageId: '71',
       languageFlavor: 'CE'
     }
   }
   ```

4. `codeContent`: Response to a `getCode` request
   ```js
   {
     type: 'codeContent',
     payload: {
       code: '// Current code',
       languageId: '71',
       languageFlavor: 'CE'
     }
   }
   ```

## Usage Examples

### Loading Boilerplate Code

When a question loads, send the boilerplate code to the IDE:

```js
// When question data is loaded
useEffect(() => {
  if (questionData && iframeRef.current) {
    iframeRef.current.contentWindow.postMessage({
      type: 'setBoilerplate',
      payload: {
        code: questionData.boilerplateCode,
        language: questionData.languageId
      }
    }, '*');
  }
}, [questionData]);
```

### Loading Test Cases

When a user clicks the "Load in IDE" button for a test case:

```js
const loadTestCaseInIDE = (testCase) => {
  iframeRef.current.contentWindow.postMessage({
    type: 'setInput',
    payload: {
      stdin: testCase.input
    }
  }, '*');
};
```

### Running Code Against Test Cases

When the user clicks "Run with Test Cases" or when the IDE's Run button is clicked:

```js
const runCodeWithTestCases = async (code, languageId) => {
  try {
    // Call your API to run the code against test cases
    const results = await api.runCode({
      code,
      languageId,
      testCases: questionData.testCases
    });
    
    // Send results back to the IDE
    iframeRef.current.contentWindow.postMessage({
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
    
    // Also update your React app's state
    setTestResults(results);
  } catch (error) {
    iframeRef.current.contentWindow.postMessage({
      type: 'runResults',
      payload: {
        success: false,
        error: error.message
      }
    }, '*');
  }
};
```
