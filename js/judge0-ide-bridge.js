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
  
  // Debug mode - set to true to see console logs
  const DEBUG = true;
  
  function log(...args) {
    if (DEBUG) {
      console.log("[Judge0 Bridge]", ...args);
    }
  }
  
  // Wait for the IDE to fully load
  const waitForIdeElements = () => {
    log("Waiting for IDE elements to load...");
    
    try {
      // Access the editors from the window object
      sourceEditor = window.sourceEditor;
      stdinEditor = window.stdinEditor;
      stdoutEditor = window.stdoutEditor;
      languageSelect = document.getElementById('select-language');
      runButton = document.getElementById('run-btn');
      
      if (!sourceEditor || !stdinEditor || !stdoutEditor || !languageSelect || !runButton) {
        // Elements not loaded yet, wait and try again
        log("Elements not ready yet, retrying in 100ms");
        setTimeout(waitForIdeElements, 100);
        return;
      }
      
      log("All IDE elements found, setting up bridge");
      
      // IDE is ready, set up message handling
      setupMessageHandling();
      
      // Notify parent that IDE is ready
      log("Sending ideReady event to parent");
      window.parent.postMessage({ type: 'ideReady' }, '*');
      
      // Override the run button to use our custom handler
      log("Overriding run button click handler");
      runButton.onclick = function(event) {
        // Get current code and language
        const code = sourceEditor.getValue();
        const languageId = languageSelect.value;
        const languageFlavor = languageSelect.options[languageSelect.selectedIndex].getAttribute('flavor');
        
        log("Run button clicked, sending code to parent", { languageId, languageFlavor });
        
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
      log("Setting up code change listener");
      sourceEditor.onDidChangeModelContent(() => {
        window.parent.postMessage({
          type: 'codeChanged',
          payload: {
            code: sourceEditor.getValue()
          }
        }, '*');
      });
    } catch (error) {
      log("Error in waitForIdeElements:", error);
      setTimeout(waitForIdeElements, 100);
    }
  };
  
  const setupMessageHandling = () => {
    log("Setting up message event listener");
    
    window.addEventListener('message', (event) => {
      try {
        log("Received message from parent:", event.data);
        
        // For security, you may want to check the origin
        // if (event.origin !== 'https://your-app-origin.com') return;
        
        const { type, payload } = event.data || {};
        
        if (!type) {
          log("Ignoring message with no type");
          return;
        }
        
        log(`Processing message of type: ${type}`);
        
        switch (type) {
          case 'setBoilerplate':
            log("Setting boilerplate code");
            // Set code in the editor
            if (payload && payload.code) {
              sourceEditor.setValue(payload.code);
              log("Boilerplate code set successfully");
            }
            
            // Set language if provided
            if (payload && payload.language) {
              log(`Setting language to: ${payload.language}`);
              // Find the language option by ID or name
              const options = languageSelect.options;
              for (let i = 0; i < options.length; i++) {
                if (options[i].value === payload.language || 
                    options[i].textContent.toLowerCase().includes(payload.language.toLowerCase())) {
                  languageSelect.selectedIndex = i;
                  log(`Found matching language at index ${i}: ${options[i].textContent}`);
                  // Trigger change event to update the IDE
                  const event = new Event('change');
                  languageSelect.dispatchEvent(event);
                  break;
                }
              }
            }
            break;
            
          case 'setInput':
            log("Setting input");
            // Set stdin content
            if (payload && payload.stdin) {
              stdinEditor.setValue(payload.stdin);
              log("Input set successfully");
            }
            break;
            
          case 'runResults':
            log("Processing run results");
            // Display results in the output area
            let outputText = '';
            
            if (payload && payload.success) {
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
              outputText += (payload && (payload.error || payload.message)) || 'An unknown error occurred';
            }
            
            stdoutEditor.setValue(outputText);
            log("Results displayed in output area");
            break;
            
          case 'getCode':
            log("Getting current code");
            // Send current code back to parent
            window.parent.postMessage({
              type: 'codeContent',
              payload: {
                code: sourceEditor.getValue(),
                languageId: languageSelect.value,
                languageFlavor: languageSelect.options[languageSelect.selectedIndex].getAttribute('flavor')
              }
            }, '*');
            log("Code sent to parent");
            break;
            
          case 'focus':
            log("Focusing editor");
            // Focus the editor
            sourceEditor.focus();
            break;
            
          default:
            log(`Unknown message type: ${type}`);
        }
      } catch (error) {
        log("Error processing message:", error);
      }
    });
  };
  
  // Start the process once the page loads
  log("Judge0 IDE Bridge script loaded");
  
  if (document.readyState === 'complete') {
    log("Document already loaded, initializing bridge");
    waitForIdeElements();
  } else {
    log("Waiting for document to load");
    window.addEventListener('load', waitForIdeElements);
  }
  
  // Add a global function to check if bridge is active
  window.isJudge0BridgeActive = true;
})();