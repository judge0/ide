import React, { useEffect, useRef, useState } from 'react';

/**
 * Judge0IDE Component
 * 
 * This component embeds a Judge0 IDE iframe and handles communication with it.
 * 
 * @param {Object} props
 * @param {string} props.ideUrl - URL to your hosted Judge0 IDE
 * @param {string} props.boilerplateCode - Initial code to load
 * @param {string} props.language - Language ID or name
 * @param {Array} props.testCases - Array of test cases
 * @param {Function} props.onCodeChange - Called when code changes
 * @param {Function} props.onRunCode - Called when Run button is clicked
 */
function Judge0IDE({
  ideUrl,
  boilerplateCode = '',
  language = 'javascript',
  testCases = [],
  onCodeChange,
  onRunCode
}) {
  const iframeRef = useRef(null);
  const [isIdeReady, setIsIdeReady] = useState(false);
  const [currentCode, setCurrentCode] = useState(boilerplateCode);
  
  // Listen for messages from the IDE
  useEffect(() => {
    const handleMessage = (event) => {
      console.log('Received message from IDE:', event.data);
      
      const { type, payload } = event.data || {};
      
      switch (type) {
        case 'ideReady':
          console.log('IDE is ready');
          setIsIdeReady(true);
          // Send initial boilerplate code when IDE is ready
          if (boilerplateCode) {
            sendBoilerplateCode();
          }
          break;
          
        case 'codeChanged':
          // Update our state when code changes in the IDE
          if (payload && payload.code) {
            setCurrentCode(payload.code);
            if (onCodeChange) {
              onCodeChange(payload.code);
            }
          }
          break;
          
        case 'runCode':
          // Run button was clicked in the IDE
          if (payload && onRunCode) {
            onRunCode(payload.code, payload.languageId);
          }
          break;
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [boilerplateCode, onCodeChange, onRunCode]);
  
  // Send boilerplate code to the IDE when it's ready
  useEffect(() => {
    if (isIdeReady && boilerplateCode) {
      sendBoilerplateCode();
    }
  }, [isIdeReady, boilerplateCode, language]);
  
  // Send boilerplate code to the IDE
  const sendBoilerplateCode = () => {
    if (!iframeRef.current) return;
    
    console.log('Sending boilerplate code to IDE');
    iframeRef.current.contentWindow.postMessage({
      type: 'setBoilerplate',
      payload: {
        code: boilerplateCode,
        language: language
      }
    }, '*');
  };
  
  // Load a test case into the IDE
  const loadTestCase = (testCase) => {
    if (!iframeRef.current || !isIdeReady) return;
    
    console.log('Loading test case into IDE:', testCase);
    iframeRef.current.contentWindow.postMessage({
      type: 'setInput',
      payload: {
        stdin: testCase.input
      }
    }, '*');
  };
  
  // Run code against all test cases
  const runCodeWithTestCases = async (code, testCases) => {
    if (!iframeRef.current || !isIdeReady) return;
    
    try {
      // This is where you would call your API to run the code against test cases
      // For now, we'll just simulate a response
      const results = {
        success: true,
        summary: {
          total: testCases.length,
          passed: Math.floor(testCases.length / 2), // Simulate some passing
          failed: Math.ceil(testCases.length / 2)   // Simulate some failing
        },
        output: testCases.map((testCase, index) => ({
          input: testCase.input,
          expectedOutput: testCase.expectedOutput,
          actualOutput: index % 2 === 0 ? testCase.expectedOutput : 'Wrong output',
          passed: index % 2 === 0
        }))
      };
      
      // Send results back to the IDE
      console.log('Sending test results to IDE:', results);
      iframeRef.current.contentWindow.postMessage({
        type: 'runResults',
        payload: results
      }, '*');
      
    } catch (error) {
      console.error('Error running code:', error);
      
      // Send error back to the IDE
      iframeRef.current.contentWindow.postMessage({
        type: 'runResults',
        payload: {
          success: false,
          error: error.message || 'An error occurred while running the code'
        }
      }, '*');
    }
  };

  // Render test cases
  const renderTestCases = () => {
    return testCases.map((testCase, index) => (
      <div key={index} className="test-case">
        <div>
          <strong>Input:</strong> {testCase.input}
        </div>
        <div>
          <strong>Expected Output:</strong> {testCase.expectedOutput}
        </div>
        <button 
          onClick={() => loadTestCase(testCase)}
          disabled={!isIdeReady}
        >
          Load in IDE
        </button>
      </div>
    ));
  };

  return (
    <div className="judge0-ide-container">
      <div className="ide-frame">
        <iframe 
          ref={iframeRef}
          src={ideUrl}
          style={{ width: '100%', height: '600px', border: 'none' }}
          title="Judge0 IDE"
        />
      </div>
      
      {testCases.length > 0 && (
        <div className="test-cases">
          <h3>Test Cases</h3>
          {renderTestCases()}
          <button 
            onClick={() => runCodeWithTestCases(currentCode, testCases)}
            disabled={!isIdeReady}
            className="run-all-button"
          >
            Run with Test Cases
          </button>
        </div>
      )}
    </div>
  );
}

export default Judge0IDE;
