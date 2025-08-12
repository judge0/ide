/**
 * Judge0 IDE Bridge Script
 * 
 * This script enables communication between your React app and the Judge0 IDE.
 * Add this script to your hosted Judge0 IDE to enable the postMessage API.
 */

(function() {
  // Get references to Judge0 IDE elements
  let sourceEditor = null;
  let stdinEditor = null;
  let stdoutEditor = null;
  let languageSelect = null;
  let runButton = null;
  
  // Wait for the IDE to fully load
  const waitForIdeElements = () => {
    // Access the editors from the window object (they're exported in ide.js)
    sourceEditor = window.sourceEditor;
    stdinEditor = window.stdinEditor;
    stdoutEditor = window.stdoutEditor;
    languageSelect = document.getElementById('select-language');
    runButton = document.getElementById('run-btn');
    
    if (!sourceEditor || !stdinEditor || !stdoutEditor || !languageSelect || !runButton) {
      // Elements not loaded yet, wait and try again
      setTimeout(waitForIdeElements, 100);
      return;
    }
    
    // IDE is ready, set up message handling
    setupMessageHandling();
    
    // Notify parent that IDE is ready
    window.parent.postMessage({ type: 'ideReady' }, '*');
    
    // Override the run button to use our custom handler
    const originalRunHandler = runButton.onclick;
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
    
    // Listen for code changes
    sourceEditor.onDidChangeModelContent(() => {
      window.parent.postMessage({
        type: 'codeChanged',
        payload: {
          code: sourceEditor.getValue()
        }
      }, '*');
    });
  };
  
  const setupMessageHandling = () => {
    window.addEventListener('message', (event) => {
      // For security, you may want to check the origin
      // if (event.origin !== 'https://your-app-origin.com') return;
      
      const { type, payload } = event.data || {};
      
      switch (type) {
        case 'setBoilerplate':
          // Set code in the editor
          if (payload.code) {
            sourceEditor.setValue(payload.code);
          }
          
          // Set language if provided
          if (payload.language) {
            // Find the language option by ID or name
            const options = languageSelect.options;
            for (let i = 0; i < options.length; i++) {
              if (options[i].value === payload.language || 
                  options[i].textContent.toLowerCase().includes(payload.language.toLowerCase())) {
                languageSelect.selectedIndex = i;
                // Trigger change event to update the IDE
                const event = new Event('change');
                languageSelect.dispatchEvent(event);
                break;
              }
            }
          }
          break;
          
        case 'setInput':
          // Set stdin content
          if (payload.stdin) {
            stdinEditor.setValue(payload.stdin);
          }
          break;
          
        case 'runResults':
          // Display results in the output area
          let outputText = '';
          
          if (payload.success) {
            outputText += '✅ Test Summary:\n';
            if (payload.summary) {
              outputText += `Total: ${payload.summary.total}, `;
              outputText += `Passed: ${payload.summary.passed}, `;
              outputText += `Failed: ${payload.summary.failed}\n\n`;
            }
            
            if (payload.output && Array.isArray(payload.output)) {
              outputText += 'Test Results:\n';
              payload.output.forEach((result, index) => {
                outputText += `\nTest Case #${index + 1}:\n`;
                outputText += `Input: ${JSON.stringify(result.input)}\n`;
                outputText += `Expected Output: ${result.expectedOutput}\n`;
                outputText += `Your Output: ${result.actualOutput || 'N/A'}\n`;
                outputText += `Status: ${result.passed ? 'PASSED ✅' : 'FAILED ❌'}\n`;
              });
            }
          } else {
            outputText += '❌ Error:\n';
            outputText += payload.error || payload.message || 'An unknown error occurred';
          }
          
          stdoutEditor.setValue(outputText);
          break;
          
        case 'getCode':
          // Send current code back to parent
          window.parent.postMessage({
            type: 'codeContent',
            payload: {
              code: sourceEditor.getValue(),
              languageId: languageSelect.value,
              languageFlavor: languageSelect.options[languageSelect.selectedIndex].getAttribute('flavor')
            }
          }, '*');
          break;
          
        case 'focus':
          // Focus the editor
          sourceEditor.focus();
          break;
      }
    });
  };
  
  // Start the process once the page loads
  if (document.readyState === 'complete') {
    waitForIdeElements();
  } else {
    window.addEventListener('load', waitForIdeElements);
  }
})();
